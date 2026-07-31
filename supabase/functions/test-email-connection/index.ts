import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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

interface EmailAccount {
  id: string;
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

async function sendTestEmail(account: EmailAccount, to: string): Promise<void> {
  const fromName = account.sender_name;
  const fromEmail = account.sender_email;
  const replyToEmail = account.reply_to_email || fromEmail;
  const subject = "Test email — connection successful";
  const html = `<p>This is a test email from your <strong>${fromName}</strong> sender account (${account.provider}).</p><p>If you received this, your email configuration is working correctly.</p>`;

  if (account.provider === "smtp" || account.provider === "ses") {
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
      await client.send({ from: `${fromName} <${fromEmail}>`, to, replyTo: replyToEmail, subject, html });
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
      body: JSON.stringify({ from: `${fromName} <${fromEmail}>`, to: [to], reply_to: replyToEmail, subject, html }),
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
        from: { email: fromEmail, name: fromName },
        to: [{ email: to }],
        reply_to: { email: replyToEmail, name: fromName },
        subject,
        html,
      }),
    });
    if (!res.ok) throw new Error(`MailerSend send failed: ${res.status} ${await res.text()}`);
    return;
  }

  throw new Error(`Sending a test email isn't supported yet for provider "${account.provider}". Supported: SMTP, Amazon SES, Resend, MailerSend.`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }
    const callerEmail = claimsData.claims.email as string | undefined;
    if (!callerEmail) return json({ error: "Your account has no email on file to send the test to" }, 400);

    const { accountId } = await req.json();
    if (!accountId) return json({ error: "accountId is required" }, 400);

    // RLS on email_accounts (coach owns row, or admin/super_admin manage all)
    // ensures the caller can only test an account they're allowed to see.
    const { data: account, error: fetchError } = await callerClient
      .from("email_accounts")
      .select("*")
      .eq("id", accountId)
      .single();

    if (fetchError || !account) {
      return json({ error: "Sender account not found or you don't have access to it" }, 404);
    }

    await sendTestEmail(account as EmailAccount, callerEmail);

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await adminClient.from("email_accounts").update({ is_verified: true }).eq("id", accountId);

    return json({ success: true, sentTo: callerEmail });
  } catch (err) {
    console.error("test-email-connection error:", err);
    return json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});
