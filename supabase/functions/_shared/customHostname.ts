// Registers a white-label hostname with Cloudflare for SaaS.
//
// DNS verification proves the domain is the coach's and that it points at us.
// This is the other half: without a custom hostname registered at the edge
// there is no certificate for it, so a browser refuses the connection before
// any of our code runs.
//
// Optional by design. A deployment with no Cloudflare credentials still
// verifies domains — it just reports that TLS is not provisioned, rather than
// failing verification outright.

const API = "https://api.cloudflare.com/client/v4";

export interface CustomHostnameState {
  /** Cloudflare's id, so a repeat check updates rather than duplicates. */
  id: string | null;
  /** pending_validation | pending_issuance | active | … as Cloudflare reports. */
  sslStatus: string | null;
  /** Set when we could not provision at all; shown to the coach verbatim. */
  error: string | null;
}

const NOT_CONFIGURED: CustomHostnameState = {
  id: null,
  sslStatus: null,
  error:
    "This platform is not set up to serve custom domains yet. Your domain is verified and will start serving once the edge is configured.",
};

function credentials(): { token: string; zoneId: string } | null {
  const token = Deno.env.get("CLOUDFLARE_API_TOKEN");
  const zoneId = Deno.env.get("CLOUDFLARE_ZONE_ID");
  if (!token || !zoneId) return null;
  return { token, zoneId };
}

/** True when the platform can provision custom hostnames at all. */
export const canProvisionHostnames = () => credentials() !== null;

async function call(
  path: string,
  init: RequestInit & { token: string },
): Promise<{ ok: boolean; result?: Record<string, unknown>; error?: string }> {
  const { token, ...rest } = init;
  const res = await fetch(`${API}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(rest.headers ?? {}),
    },
  });

  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    // Cloudflare returns a list; the first message is the actionable one.
    const message = body?.errors?.[0]?.message ?? `Cloudflare returned ${res.status}`;
    console.error("cloudflare custom hostname:", res.status, JSON.stringify(body?.errors ?? {}));
    return { ok: false, error: String(message) };
  }
  return { ok: true, result: body.result };
}

/**
 * Makes sure `hostname` is registered, and reports where its certificate is up
 * to. Safe to call repeatedly: an existing id is refreshed, and a hostname
 * Cloudflare already knows is adopted rather than duplicated.
 */
export async function ensureCustomHostname(
  hostname: string,
  existingId: string | null,
): Promise<CustomHostnameState> {
  const creds = credentials();
  if (!creds) return NOT_CONFIGURED;

  const { token, zoneId } = creds;
  const base = `/zones/${zoneId}/custom_hostnames`;

  // Already registered: just read its current certificate state.
  if (existingId) {
    const found = await call(`${base}/${existingId}`, { method: "GET", token });
    if (found.ok) {
      return {
        id: existingId,
        sslStatus: String((found.result?.ssl as { status?: string })?.status ?? "unknown"),
        error: null,
      };
    }
    // Fall through and re-create: the id can be stale if it was deleted at the
    // Cloudflare end.
  }

  const created = await call(base, {
    method: "POST",
    token,
    body: JSON.stringify({
      hostname,
      ssl: {
        // The hostname already CNAMEs to us by the time this runs, so HTTP
        // validation completes without the coach touching DNS again.
        method: "http",
        type: "dv",
        settings: { min_tls_version: "1.2" },
      },
    }),
  });

  if (created.ok) {
    return {
      id: String(created.result?.id ?? ""),
      sslStatus: String((created.result?.ssl as { status?: string })?.status ?? "pending_validation"),
      error: null,
    };
  }

  // Someone already registered it — ours from an earlier run, or another
  // tenant. Adopt it if we can find it; otherwise say so plainly.
  const existing = await call(`${base}?hostname=${encodeURIComponent(hostname)}`, {
    method: "GET",
    token,
  });
  const match = Array.isArray(existing.result) ? existing.result[0] : null;
  if (existing.ok && match) {
    return {
      id: String((match as { id: string }).id),
      sslStatus: String((match as { ssl?: { status?: string } }).ssl?.status ?? "unknown"),
      error: null,
    };
  }

  return { id: null, sslStatus: null, error: created.error ?? "Could not register the hostname." };
}

/** Human-readable state for the certificate, for the settings screen. */
export function describeSsl(status: string | null): string {
  switch (status) {
    case "active":
      return "Certificate issued — the domain is serving over HTTPS.";
    case "pending_validation":
    case "pending_issuance":
    case "initializing":
      return "Certificate is being issued. This usually takes a few minutes.";
    case null:
    case undefined:
      return "Not provisioned yet.";
    default:
      return `Certificate status: ${status}.`;
  }
}
