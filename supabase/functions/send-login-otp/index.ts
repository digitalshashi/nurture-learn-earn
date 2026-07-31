import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OTP_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;

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

function generateCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const num = new DataView(bytes.buffer).getUint32(0);
  return String(num % 1_000_000).padStart(6, "0");
}

function renderTemplate(str: string, vars: Record<string, string>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
      return json({ error: "A valid email is required" }, 400);
    }
    const normalizedEmail = email.trim().toLowerCase();

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, full_name, email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    // Don't reveal whether an account exists.
    if (!profile) {
      return json({ success: true });
    }

    const { data: lastOtp } = await adminClient
      .from("login_otps")
      .select("created_at")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastOtp) {
      const secondsSinceLast = (Date.now() - new Date(lastOtp.created_at).getTime()) / 1000;
      if (secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
        return json(
          { error: `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLast)}s before requesting another code` },
          429,
        );
      }
    }

    const code = generateCode();
    const otpHash = await hashCode(code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

    const { error: insertError } = await adminClient.from("login_otps").insert({
      email: normalizedEmail,
      otp_hash: otpHash,
      expires_at: expiresAt,
    });
    if (insertError) throw insertError;

    const { data: account } = await adminClient
      .from("email_accounts")
      .select("*")
      .eq("is_platform_default", true)
      .eq("is_verified", true)
      .limit(1)
      .maybeSingle();

    if (!account) {
      return json(
        { error: "Email delivery is not configured. Ask your administrator to set a platform-default sender in Email Settings." },
        500,
      );
    }

    const { data: template } = await adminClient
      .from("email_templates")
      .select("*")
      .eq("template_key", "login_otp")
      .is("coach_id", null)
      .eq("is_active", true)
      .maybeSingle();

    const subjectTpl = template?.subject || "Your login code: {{otp_code}}";
    const bodyTpl =
      template?.body_html ||
      "<p>Hi {{full_name}},</p><p>Your one-time login code is:</p><h2>{{otp_code}}</h2><p>This code expires in {{expiry_minutes}} minutes.</p>";

    const vars = {
      otp_code: code,
      full_name: profile.full_name || "there",
      expiry_minutes: String(OTP_TTL_MINUTES),
    };

    await sendEmail({
      account,
      to: normalizedEmail,
      subject: renderTemplate(subjectTpl, vars),
      html: renderTemplate(bodyTpl, vars),
      fromName: template?.from_name,
      replyToName: template?.reply_to_name,
      replyToEmail: template?.reply_to_email,
    });

    return json({ success: true });
  } catch (err) {
    console.error("send-login-otp error:", err);
    return json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});
