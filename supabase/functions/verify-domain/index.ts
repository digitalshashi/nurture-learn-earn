// Proves a coach controls the hostname they claimed, by reading DNS.
//
// Two records, because they answer different questions:
//   TXT at _1corehub-verify.<domain>  — proves ownership. Only someone who can
//                                       edit the zone can publish our token.
//   CNAME at <domain>                 — proves it will actually reach us, so a
//                                       verified domain is one that resolves.
//
// Both are read here with the service role rather than trusted from the
// browser: the client could otherwise mark any hostname verified.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, corsHeaders, json, requireUser } from "../_shared/edge.ts";
import { ensureCustomHostname } from "../_shared/customHostname.ts";

const VERIFY_PREFIX = "_1corehub-verify";

/** Cloudflare's DNS-over-HTTPS resolver, so no DNS client is needed. */
async function resolve(name: string, type: "TXT" | "CNAME" | "A"): Promise<string[]> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetch(url, { headers: { accept: "application/dns-json" } });
  if (!res.ok) throw new Error(`DNS lookup failed (${res.status})`);

  const body = await res.json();
  return (body.Answer ?? [])
    .filter((a: { type: number }) => a.type === { TXT: 16, CNAME: 5, A: 1 }[type])
    .map((a: { data: string }) =>
      // TXT answers arrive quoted, and CNAMEs with a trailing dot.
      a.data.replace(/^"|"$/g, "").replace(/\.$/, "").trim(),
    );
}

/** A hostname we are willing to look up: no schemes, paths, ports or spaces. */
function normaliseDomain(input: unknown): string | null {
  const value = String(input ?? "").trim().toLowerCase();
  if (!value) return null;
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(value)) {
    return null;
  }
  return value;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { userId, error: authError } = await requireUser(req);
  if (authError) return authError;

  try {
    const admin = adminClient();

    // The row is read by owner, never by a domain passed in from the client —
    // otherwise anyone could verify a hostname onto someone else's tenant.
    const { data: row } = await admin
      .from("domain_settings")
      .select("id, coach_id, domain, verification_token, cname_target, cf_hostname_id")
      .eq("coach_id", userId)
      .maybeSingle();

    if (!row) return json({ error: "No domain configured yet." }, 400);

    const domain = normaliseDomain(row.domain);
    if (!domain) return json({ error: "That does not look like a hostname." }, 400);

    const expectedToken = row.verification_token as string;
    const cnameTarget = String(row.cname_target).toLowerCase();

    const problems: string[] = [];

    // --- ownership -------------------------------------------------------
    let txtValues: string[] = [];
    try {
      txtValues = await resolve(`${VERIFY_PREFIX}.${domain}`, "TXT");
    } catch {
      problems.push("Could not read TXT records for the domain.");
    }
    const ownershipOk = txtValues.includes(expectedToken);
    if (!ownershipOk && txtValues.length === 0) {
      problems.push(`No TXT record found at ${VERIFY_PREFIX}.${domain}.`);
    } else if (!ownershipOk) {
      problems.push("The TXT record is present but does not match the token.");
    }

    // --- routing ---------------------------------------------------------
    let pointsAtUs = false;
    try {
      const cnames = await resolve(domain, "CNAME");
      pointsAtUs = cnames.some((c) => c.toLowerCase() === cnameTarget);
      if (!pointsAtUs && cnames.length > 0) {
        problems.push(`The CNAME points at ${cnames[0]} instead of ${cnameTarget}.`);
      } else if (!pointsAtUs) {
        problems.push(`No CNAME found for ${domain} pointing at ${cnameTarget}.`);
      }
    } catch {
      problems.push("Could not read the CNAME record for the domain.");
    }

    const verified = ownershipOk && pointsAtUs;

    // Only once DNS actually checks out: registering a hostname that does not
    // point at us leaves a certificate that can never validate.
    const ssl = verified
      ? await ensureCustomHostname(domain, (row.cf_hostname_id as string | null) ?? null)
      : { id: (row.cf_hostname_id as string | null) ?? null, sslStatus: null, error: null };

    await admin
      .from("domain_settings")
      .update({
        status: verified ? "verified" : "pending",
        verified_at: verified ? new Date().toISOString() : null,
        last_checked_at: new Date().toISOString(),
        last_error: verified ? null : problems.join(" "),
        cf_hostname_id: ssl.id,
        ssl_status: ssl.sslStatus,
        ssl_error: ssl.error,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    return json({
      verified,
      ownership_ok: ownershipOk,
      points_at_us: pointsAtUs,
      ssl_status: ssl.sslStatus,
      ssl_error: ssl.error,
      // DNS changes are not instant, and saying so saves a support ticket.
      message: verified
        ? "Domain verified."
        : `${problems.join(" ")} DNS changes can take up to an hour to spread.`,
    });
  } catch (e) {
    console.error("verify-domain error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
