// Sends a one-off test email: any subject and HTML, to any address, through a
// chosen sender account.
//
// test-email-connection only proves a mailbox is reachable — it sends a fixed
// message to the caller's own address. This one exists so a template can be
// checked in a real client before it goes to members.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  renderTemplate,
  resolveSenderAccount,
  sendEmail,
  type EmailAccount,
} from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let coachId: string | null = null;
  let accountId: string | null = null;
  let recipient = "";
  let subject = "";

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const caller = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await caller.auth.getClaims(token);
    if (claimsError || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    coachId = String(claims.claims.sub);

    const body = await req.json().catch(() => ({}));
    recipient = String(body.to || "").trim();
    subject = String(body.subject || "").trim();
    const html = String(body.html || "");
    accountId = body.account_id ? String(body.account_id) : null;
    const purpose = String(body.purpose || "transactional");
    const variables = (body.variables ?? {}) as Record<string, string>;

    if (!looksLikeEmail(recipient)) return json({ error: "Enter a valid recipient address" }, 400);
    if (!subject) return json({ error: "Subject is required" }, 400);
    if (!html.trim()) return json({ error: "Body is required" }, 400);

    // Resolve the sender. An explicit account must belong to the caller —
    // otherwise anyone could send through another coach's provider credentials.
    let account: EmailAccount | null = null;

    if (accountId) {
      const { data } = await admin
        .from("email_accounts")
        .select("*")
        .eq("id", accountId)
        .eq("coach_id", coachId)
        .maybeSingle();

      if (!data) return json({ error: "That sender account isn't yours to send from" }, 403);
      account = data as EmailAccount;
    } else {
      account = await resolveSenderAccount(admin, coachId, purpose);
    }

    if (!account) {
      return json(
        { error: "No sender account is configured yet. Add one under Settings → Email sending." },
        400,
      );
    }

    // Same substitution the real send uses, so the preview matches delivery.
    const renderedSubject = renderTemplate(subject, variables);
    const renderedHtml = renderTemplate(html, variables);

    await sendEmail(account, { to: recipient, subject: renderedSubject, html: renderedHtml });

    await admin.from("email_test_sends").insert({
      coach_id: coachId,
      account_id: account.id,
      recipient,
      subject: renderedSubject,
      succeeded: true,
    });

    return json({
      success: true,
      sent_from: `${account.sender_name} <${account.sender_email}>`,
      provider: account.provider,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not send the test email";
    console.error("send-test-email error:", message);

    // Record the failure too — "nothing arrived" and "we never tried" look the
    // same from the recipient's side otherwise.
    if (coachId) {
      await admin
        .from("email_test_sends")
        .insert({
          coach_id: coachId,
          account_id: accountId,
          recipient,
          subject,
          succeeded: false,
          error: message.slice(0, 500),
        })
        .then(() => {}, () => {});
    }

    return json({ error: message }, 500);
  }
});
