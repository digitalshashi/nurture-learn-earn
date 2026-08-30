// Helpers every edge function needs: CORS, JSON responses, a service-role
// client and JWT verification.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export const adminClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

/**
 * These functions run with verify_jwt = false so the OPTIONS preflight and our
 * own error shapes are under our control, which means the JWT has to be
 * checked here rather than assumed.
 */
/**
 * The caller's id when they are signed in, or null when they are not.
 *
 * Checkout is reachable signed out — a coach shares the link publicly — so the
 * payment endpoints have to tell "no account yet" apart from "bad token"
 * rather than rejecting both.
 */
export async function optionalUser(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "").trim();
  // The browser sends the literal string when no session exists.
  if (!token || token === "undefined" || token === "null") return null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return String(data.claims.sub);
}

export async function requireUser(req: Request): Promise<
  { userId: string; error: null } | { userId: null; error: Response }
> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { userId: null, error: json({ error: "Unauthorized" }, 401) };
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    return { userId: null, error: json({ error: "Unauthorized" }, 401) };
  }
  return { userId: String(data.claims.sub), error: null };
}
