import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_ATTEMPTS = 5;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, code } = await req.json();
    if (!email || !code || typeof code !== "string") {
      return json({ error: "Email and code are required" }, 400);
    }
    const normalizedEmail = String(email).trim().toLowerCase();

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: otpRow } = await adminClient
      .from("login_otps")
      .select("*")
      .eq("email", normalizedEmail)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpRow) {
      return json({ error: "Code expired or invalid. Request a new one." }, 400);
    }
    if (new Date(otpRow.expires_at).getTime() < Date.now()) {
      return json({ error: "Code expired or invalid. Request a new one." }, 400);
    }
    if (otpRow.attempts >= MAX_ATTEMPTS) {
      return json({ error: "Too many attempts. Request a new code." }, 429);
    }

    const submittedHash = await hashCode(code.trim());
    if (submittedHash !== otpRow.otp_hash) {
      await adminClient.from("login_otps").update({ attempts: otpRow.attempts + 1 }).eq("id", otpRow.id);
      return json({ error: "Incorrect code" }, 400);
    }

    await adminClient.from("login_otps").update({ consumed_at: new Date().toISOString() }).eq("id", otpRow.id);

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
    });
    if (linkError || !linkData?.properties?.hashed_token) {
      throw linkError || new Error("Failed to generate session token");
    }

    return json({ success: true, hashed_token: linkData.properties.hashed_token });
  } catch (err) {
    console.error("verify-login-otp error:", err);
    return json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});
