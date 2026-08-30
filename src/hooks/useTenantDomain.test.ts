import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { isPlatformHost } from "./useTenantDomain";

describe("isPlatformHost", () => {
  it("treats the platform's own addresses as not a tenant", () => {
    // These must never resolve to a tenant, or a deploy preview would start
    // enforcing someone else's membership rules on the main sign-in.
    for (const host of [
      "localhost",
      "127.0.0.1",
      "1corehub.sasivanga.workers.dev",
      "preview.pages.dev",
    ]) {
      expect(isPlatformHost(host), host).toBe(true);
    }
  });

  it("treats a real customer domain as a possible tenant", () => {
    for (const host of ["learn.acme.com", "academy.example.co.uk"]) {
      expect(isPlatformHost(host), host).toBe(false);
    }
  });

  it("ignores case, since hostnames are not case sensitive", () => {
    expect(isPlatformHost("LOCALHOST")).toBe(true);
    expect(isPlatformHost("MyApp.Workers.Dev")).toBe(true);
  });
});

describe("white-label domain migration", () => {
  const sql = readFileSync(
    "supabase/migrations/20260829125000_white_label_domains.sql",
    "utf8",
  );

  it("keeps the verification token away from anon", () => {
    // Anon must resolve which tenant a hostname belongs to before anyone signs
    // in, but a readable token would let a stranger prove ownership of it.
    const anonGrant = sql.match(/GRANT SELECT \(([^)]*)\)\s*\n?\s*ON public\.domain_settings TO anon;/);
    expect(anonGrant, "anon grant not found").toBeTruthy();
    expect(anonGrant![1]).not.toContain("verification_token");
    expect(anonGrant![1]).toContain("domain");
    expect(anonGrant![1]).toContain("coach_id");
  });

  it("only exposes a domain that is both verified and live", () => {
    expect(sql).toContain("USING (status = 'verified' AND is_live)");
  });

  it("refuses to let two tenants claim one hostname", () => {
    expect(sql).toContain("domain_settings_domain_uniq");
    // Blank rows are the "not configured" state and must not collide.
    expect(sql).toContain("WHERE domain IS NOT NULL AND domain <> ''");
  });

  it("lets support in, so a broken tenant can still be fixed", () => {
    expect(sql).toContain("public.has_role(_user_id, 'super_admin')");
  });

  it("admits the owner, their team and people who hold something of theirs", () => {
    expect(sql).toContain("team_members");
    expect(sql).toContain("enrollments");
    expect(sql).toContain("service_users");
  });

  it("leaves every non-white-label hostname alone", () => {
    // may_use_domain coalesces to true, so the platform's own address and any
    // unconfigured domain behave exactly as before.
    const fn = sql.slice(sql.indexOf("FUNCTION public.may_use_domain"));
    expect(fn).toContain("COALESCE(");
    expect(fn.replace(/\s+/g, " ")).toContain(", true )");
  });
});

describe("domain verification", () => {
  const fn = readFileSync("supabase/functions/verify-domain/index.ts", "utf8");

  it("reads the claimed domain from the row, never from the request", () => {
    // Trusting a domain from the client would let anyone verify a hostname
    // onto someone else's tenant.
    expect(fn).toContain('.eq("coach_id", userId)');
    expect(fn).not.toMatch(/body\.domain|req\.json\(\)\s*;?\s*[\s\S]{0,80}domain/);
  });

  it("requires both ownership and routing before verifying", () => {
    expect(fn).toContain("const verified = ownershipOk && pointsAtUs;");
  });

  it("rejects anything that is not a bare hostname", () => {
    const normalise = fn.slice(fn.indexOf("function normaliseDomain"));
    const pattern = normalise.match(/\/\^\[a-z0-9\].*\/\.test/)?.[0];
    expect(pattern, "hostname pattern not found").toBeTruthy();
  });
});

describe("custom hostname provisioning", () => {
  const mod = readFileSync("supabase/functions/_shared/customHostname.ts", "utf8");
  const verify = readFileSync("supabase/functions/verify-domain/index.ts", "utf8");

  it("provisions only after DNS verifies", () => {
    // Registering a hostname that does not point at us leaves a certificate
    // that can never validate, and a stuck row nobody can explain.
    expect(verify).toMatch(/const ssl = verified\s*\n?\s*\? await ensureCustomHostname/);
  });

  it("stays optional, so a deployment without Cloudflare still verifies domains", () => {
    // The credentials are platform-level. Without them a coach should still be
    // able to prove ownership — they just are not served yet.
    expect(mod).toContain("if (!creds) return NOT_CONFIGURED;");
    expect(mod).toContain("CLOUDFLARE_API_TOKEN");
    expect(mod).toContain("CLOUDFLARE_ZONE_ID");
  });

  it("adopts a hostname Cloudflare already knows rather than duplicating it", () => {
    // A retry, or a row whose id went stale, must not create a second
    // registration for the same hostname.
    expect(mod).toContain("?hostname=");
    expect(mod).toContain("existingId");
  });

  it("never leaks Cloudflare ids to anon", () => {
    const sql = readFileSync(
      "supabase/migrations/20260829150000_custom_hostname_tls.sql",
      "utf8",
    );
    expect(sql).toContain("TO authenticated");
    expect(sql).not.toMatch(/GRANT SELECT[\s\S]*cf_hostname_id[\s\S]*TO anon/);
  });
});
