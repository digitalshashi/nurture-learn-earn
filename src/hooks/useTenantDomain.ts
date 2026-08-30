import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * The tenant whose white-label domain this page is being served on, if any.
 *
 * Resolved from the hostname before anyone signs in, which is why a live
 * verified domain is readable by anon — identity only, never its token.
 */
export interface TenantDomain {
  ownerId: string;
  domain: string;
}

/**
 * Hostnames that are the platform itself, never a tenant.
 *
 * The primary domain belongs here even though nothing breaks without it today:
 * resolveTenant only matches a verified, live domain_settings row, so an
 * unlisted host is already treated as the platform. But learn.jointeluguai.com
 * is shaped exactly like a customer domain, and the day someone adds it as
 * their white-label host the main sign-in would start enforcing that coach's
 * membership rules on everyone.
 */
const PLATFORM_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
  "learn.jointeluguai.com",
]);

export function isPlatformHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    PLATFORM_HOSTS.has(host) ||
    host.endsWith(".workers.dev") ||
    host.endsWith(".pages.dev") ||
    host.endsWith(".lovable.app")
  );
}

/**
 * Looks up the tenant for a hostname.
 *
 * Returns null for the platform's own addresses and for any hostname with no
 * live verified row, so sign-in there behaves exactly as it always has.
 */
export async function resolveTenant(hostname: string): Promise<TenantDomain | null> {
  if (isPlatformHost(hostname)) return null;

  const { data } = await supabase
    .from("domain_settings")
    .select("coach_id, domain")
    .eq("domain", hostname.toLowerCase())
    .eq("status", "verified")
    .eq("is_live", true)
    .maybeSingle();

  if (!data) return null;
  return { ownerId: (data as { coach_id: string }).coach_id, domain: hostname.toLowerCase() };
}

/** Resolves the current hostname's tenant once per load. */
export function useTenantDomain() {
  const [tenant, setTenant] = useState<TenantDomain | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    resolveTenant(window.location.hostname)
      .then((t) => {
        if (active) setTenant(t);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { tenant, loading };
}

/**
 * Whether a signed-in user is allowed on this hostname.
 *
 * The check runs in the database, because the browser is not a place to decide
 * who may be admitted: may_use_domain answers true for every hostname that is
 * not a live white-label domain, so the platform own address is unaffected.
 */
export async function checkDomainAccess(userId: string, hostname: string): Promise<boolean> {
  if (isPlatformHost(hostname)) return true;

  const { data, error } = await supabase.rpc("may_use_domain", {
    _user_id: userId,
    _hostname: hostname.toLowerCase(),
  });

  // Fail open on an error: a transient outage must not lock a coach out of
  // their own academy. RLS still scopes everything they can then read.
  if (error) return true;
  return data !== false;
}
