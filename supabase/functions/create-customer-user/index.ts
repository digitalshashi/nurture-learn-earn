import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, name, phone } = await req.json();
    if (!email || typeof email !== "string") {
      return json({ error: "Email is required" }, 400);
    }
    const normalizedEmail = email.trim().toLowerCase();

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingProfile?.id) {
      return json({ user_id: existingProfile.id, created: false });
    }

    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      email_confirm: true,
      user_metadata: {
        full_name: name || "",
        phone: phone || "",
      },
    });

    if (createError) {
      return json({ error: createError.message }, 400);
    }

    return json({ user_id: createData.user.id, created: true });
  } catch (err) {
    console.error("create-customer-user error:", err);
    return json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});
