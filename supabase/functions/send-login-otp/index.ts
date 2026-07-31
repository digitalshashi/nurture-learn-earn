import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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

interface EmailAccount {
  provider: string;
  sender_name: string;
  sender_email: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_encryption: string | null;
  smtp_username: string | null;
  smtp_password: string | null;
  api_key: string | null;
  reply_to_name: string | null;
  reply_to_email: string | null;
}

interface SendEmailArgs {
  account: EmailAccount;
  to: string;
  subject: string;
  html: string;
  fromName?: string | null;
  replyToName?: string | null;
  replyToEmail?: string | null;
}

async function sendEmail({ account, to, subject, html, fromName, replyToName, replyToEmail }: SendEmailArgs): Promise<void> {
  const resolvedFromName = fromName || account.sender_name;
  const resolvedFromEmail = account.sender_email;
  const resolvedReplyToName = replyToName || account.reply_to_name || resolvedFromName;
  const resolvedReplyToEmail = replyToEmail || account.reply_to_email || resolvedFromEmail;

  if (account.provider === "smtp" || account.provider === "ses") {
    // Amazon SES: use the SMTP interface with SES SMTP credentials (from the
    // SES console), not raw IAM access keys — avoids implementing AWS SigV4.
    if (!account.smtp_host || !account.smtp_username || !account.smtp_password) {
      throw new Error("SMTP credentials are incomplete for this sender account");
    }
    const client = new SMTPClient({
      connection: {
        hostname: account.smtp_host,
        port: account.smtp_port || 587,
        tls: account.smtp_encryption === "ssl",
        auth: { username: account.smtp_username, password: account.smtp_password },
      },
    });
    try {
      await client.send({
        from: `${resolvedFromName} <${resolvedFromEmail}>`,
        to,
        replyTo: resolvedReplyToEmail,
        subject,
        html,
      });
    } finally {
      await client.close();
    }
    return;
  }

  if (account.provider === "resend") {
    if (!account.api_key) throw new Error("Resend API key is missing for this sender account");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${account.api_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${resolvedFromName} <${resolvedFromEmail}>`,
        to: [to],
        reply_to: resolvedReplyToEmail,
        subject,
        html,
      }),
    });
    if (!res.ok) throw new Error(`Resend send failed: ${res.status} ${await res.text()}`);
    return;
  }

  if (account.provider === "mailersend") {
    if (!account.api_key) throw new Error("MailerSend API key is missing for this sender account");
    const res = await fetch("https://api.mailersend.com/v1/email", {
      method: "POST",
      headers: { Authorization: `Bearer ${account.api_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: { email: resolvedFromEmail, name: resolvedFromName },
        to: [{ email: to }],
        reply_to: { email: resolvedReplyToEmail, name: resolvedReplyToName },
        subject,
        html,
      }),
    });
    if (!res.ok) throw new Error(`MailerSend send failed: ${res.status} ${await res.text()}`);
    return;
  }

  throw new Error(`Unsupported email provider: ${account.provider}`);
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

    // Single lookup, gating early return — must happen before anything else.
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, full_name, email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    // Don't reveal whether an account exists.
    if (!profile) {
      return json({ success: true });
    }

    // The rest of the reads are independent of each other — run them
    // concurrently instead of sequentially to cut round-trip latency.
    // Account resolution is collapsed into a single ordered query
    // (platform-default+verified first, else newest verified, else newest
    // any) instead of up to 3 sequential fallback queries.
    const [{ data: lastOtp }, { data: account }, { data: template }] = await Promise.all([
      adminClient
        .from("login_otps")
        .select("created_at")
        .eq("email", normalizedEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      adminClient
        .from("email_accounts")
        .select("*")
        .order("is_platform_default", { ascending: false })
        .order("is_verified", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      adminClient
        .from("email_templates")
        .select("*")
        .eq("template_key", "login_otp")
        .is("coach_id", null)
        .eq("is_active", true)
        .maybeSingle(),
    ]);

    if (lastOtp) {
      const secondsSinceLast = (Date.now() - new Date(lastOtp.created_at).getTime()) / 1000;
      if (secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
        return json(
          { error: `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLast)}s before requesting another code` },
          429,
        );
      }
    }

    if (!account) {
      return json(
        { error: "Email delivery is not configured. Ask your administrator to add a sender account in Email Settings." },
        500,
      );
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

    const subjectTpl = template?.subject || "Your login code: {{otp_code}}";
    const bodyTpl =
      template?.body_html ||
      "<p>Hi {{full_name}},</p><p>Your one-time login code is:</p><h2>{{otp_code}}</h2><p>This code expires in {{expiry_minutes}} minutes.</p>";

    const vars = {
      otp_code: code,
      full_name: profile.full_name || "there",
      expiry_minutes: String(OTP_TTL_MINUTES),
    };

    const sendPromise = sendEmail({
      account,
      to: normalizedEmail,
      subject: renderTemplate(subjectTpl, vars),
      html: renderTemplate(bodyTpl, vars),
      fromName: template?.from_name,
      replyToName: template?.reply_to_name,
      replyToEmail: template?.reply_to_email,
    }).catch((err) => console.error("send-login-otp background send failed:", err));

    // Respond as soon as the code is safely stored — don't make the client
    // wait on the SMTP/API round-trip. EdgeRuntime.waitUntil keeps the
    // function instance alive long enough to finish the send in the background.
    // @ts-ignore -- EdgeRuntime is a Supabase/Deno Deploy runtime global, not in the TS lib.
    if (typeof EdgeRuntime !== "undefined") {
      // @ts-ignore
      EdgeRuntime.waitUntil(sendPromise);
    } else {
      await sendPromise;
    }

    return json({ success: true });
  } catch (err) {
    console.error("send-login-otp error:", err);
    return json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});
