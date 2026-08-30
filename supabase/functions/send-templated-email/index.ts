// Sends one of the stored email templates.
//
// Until this existed, only login_otp was ever actually sent — every other
// template could be edited but nothing read it. This is the single entry point
// any trigger (payment, enrolment, registration) calls to put a real template
// in someone's inbox.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  coachCurrency,
  currencySymbol,
  formatMoneyForEmail,
  htmlToText,
  isSuppressed,
  isTransactionalTemplate,
  renderTemplate,
  resolveSenderAccount,
  sendEmail,
  unsubscribeUrls,
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

/** Which sender account a template should go out from. */
const PURPOSE_BY_KEY: Record<string, string> = {
  login_otp: "transactional",
  password_reset: "transactional",
  payment_receipt: "transactional",
  refund_processed: "transactional",
  payment_failed: "transactional",
  subscription_renewal_reminder: "transactional",
  service_purchase_confirmed: "transactional",
  team_invite: "transactional",

  abandoned_checkout: "marketing",
  course_progress_digest: "marketing",

  new_message: "support",
  qna_reply: "support",
};
const purposeFor = (key: string) => PURPOSE_BY_KEY[key] ?? "automation";

const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/** For the one piece of markup built here rather than rendered from a template. */
const escapeHtml = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The most non-transactional email one address may receive in a day.
 *
 * A backstop, not a policy. Nothing here is meant to send five marketing mails
 * to one person in a day; if it happens it is a loop, a bad migration or a
 * misconfigured automation, and the recipient should not be the one who
 * discovers it. Receipts and sign-in codes are exempt — they are answers to
 * something the person just did, and there is no number of them that is spam.
 */
const DAILY_NON_TRANSACTIONAL_CAP = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Only trusted server-side callers may send arbitrary templated mail; this
    // is not something a browser session should be able to trigger at will.
    const secret = req.headers.get("x-internal-secret");
    const expected = Deno.env.get("INTERNAL_FUNCTION_SECRET");
    if (!expected || secret !== expected) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const templateKey = String(body.template_key || "").trim();
    const to = String(body.to || "").trim();
    const coachId = body.coach_id ? String(body.coach_id) : null;
    const variables = (body.variables ?? {}) as Record<string, string>;
    const dedupeKey = body.dedupe_key ? String(body.dedupe_key) : null;

    if (!templateKey) return json({ error: "template_key is required" }, 400);
    if (!looksLikeEmail(to)) return json({ error: "A valid recipient is required" }, 400);

    const recipient = to.toLowerCase();
    const transactional = isTransactionalTemplate(templateKey);

    // ------------------------------------------------------------ the guards
    //
    // Everything below runs before a template is even loaded, because the
    // cheapest email is the one that is never built. They run in increasing
    // cost order: an opt-out is a single indexed lookup, the cap is a count.

    if (!transactional) {
      if (await isSuppressed(admin, recipient, coachId)) {
        return json({ skipped: "unsubscribed", template_key: templateKey }, 200);
      }

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await admin
        .from("email_send_ledger")
        .select("id", { count: "exact", head: true })
        .eq("recipient", recipient)
        .eq("is_transactional", false)
        .gte("sent_at", since);

      if ((count ?? 0) >= DAILY_NON_TRANSACTIONAL_CAP) {
        console.warn(
          `frequency cap hit for ${recipient} — dropping ${templateKey} (${count} in 24h)`,
        );
        return json({ skipped: "daily_cap", template_key: templateKey }, 200);
      }
    }

    // Claiming the ledger row before sending is what makes this idempotent:
    // two concurrent runs race on the unique index and exactly one proceeds.
    // Claiming it after would let both send and both then insert.
    if (dedupeKey) {
      const { error: claimError } = await admin
        .from("email_send_ledger")
        .insert({
          recipient,
          template_key: templateKey,
          coach_id: coachId,
          dedupe_key: dedupeKey,
          is_transactional: transactional,
        });

      // 23505 is unique_violation: someone already sent this exact thing.
      if (claimError) {
        if (claimError.code === "23505") {
          return json({ skipped: "duplicate", template_key: templateKey }, 200);
        }
        console.error("ledger claim failed:", claimError.message);
      }
    }

    // A coach's own version wins over the platform default.
    const { data: rows } = await admin
      .from("email_templates")
      .select("*")
      .eq("template_key", templateKey)
      .eq("is_active", true);

    const candidates = (rows || []) as Array<Record<string, unknown>>;
    const template =
      candidates.find((r) => r.coach_id === coachId) ??
      candidates.find((r) => r.coach_id === null);

    if (!template) {
      return json({ error: `No active template for "${templateKey}"` }, 404);
    }

    const purpose = purposeFor(templateKey);
    const account: EmailAccount | null = coachId
      ? await resolveSenderAccount(admin, coachId, purpose)
      : ((
          await admin
            .from("email_accounts")
            .select("*")
            .order("is_platform_default", { ascending: false })
            .order("is_verified", { ascending: false })
            .limit(1)
            .maybeSingle()
        ).data as EmailAccount | null);

    if (!account) return json({ error: "No sender account is configured" }, 400);

    // Every template's shell references these two; leaving them out prints a
    // literal {{academy_name}} in the delivered mail.
    // Money in an email must read the way it reads in the app: the same
    // symbol and the same grouping, taken from the workspace setting.
    const currency = await coachCurrency(admin, coachId);

    const vars: Record<string, string> = {
      academy_name: account.sender_name || "Your academy",
      year: String(new Date().getFullYear()),
      currency_symbol: currencySymbol(currency),
      currency_code: currency,
      ...variables,
    };

    // Any amount handed in as a bare number is formatted; a caller that has
    // already formatted one is left alone.
    for (const key of ["amount", "total", "price", "xp_bonus"]) {
      const raw = vars[key];
      if (raw !== undefined && /^-?\d+(\.\d+)?$/.test(String(raw).trim())) {
        vars[key] = formatMoneyForEmail(raw, currency);
      }
    }

    // A real, working opt-out on everything that isn't transactional.
    //
    // Gmail and Yahoo have required one-click unsubscribe from bulk senders
    // since February 2024, and both treat its absence as a reason to filter.
    // The header is what their infrastructure reads; the footer link is what a
    // person clicks. Transactional mail deliberately gets neither — offering
    // to unsubscribe someone from their own payment receipts is not a kindness,
    // and mailbox providers do not expect it there.
    const urls = transactional ? null : await unsubscribeUrls(recipient, coachId);
    const replyTo = (template.reply_to_email as string) || account.reply_to_email ||
      account.sender_email;

    if (urls) vars.unsubscribe_link = urls.page;

    const subject = renderTemplate(String(template.subject), vars);
    let html = renderTemplate(String(template.body_html), vars);

    // Templates predate the link, so most have nowhere to put it. Rather than
    // rewrite forty-three bodies, append a footer to any that doesn't already
    // reference it — the ones that do keep control of their own placement.
    if (urls && !html.includes(urls.page)) {
      const footer = `<div style="margin:0;padding:18px 24px 28px;background-color:#f4f5f7;` +
        `font:13px/20px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;` +
        `color:#6b7280;text-align:center;">` +
        `You're receiving this because you have an account with ${escapeHtml(vars.academy_name)}. ` +
        `<a href="${escapeHtml(urls.page)}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>` +
        `</div>`;
      html = html.includes("</body>")
        ? html.replace("</body>", `${footer}</body>`)
        : html + footer;
    }

    const headers: Record<string, string> = {
      // Tells an autoresponder not to reply to us, and a mailbox provider that
      // this is machine-generated rather than a person writing to a person.
      "Auto-Submitted": "auto-generated",
    };

    if (urls) {
      headers["List-Unsubscribe"] = `<${urls.oneClick}>, <mailto:${replyTo}?subject=unsubscribe>`;
      headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
      // Marks the message as bulk so it is weighted as such deliberately,
      // rather than being guessed at.
      headers["Precedence"] = "bulk";
    }

    try {
      await sendEmail(
        {
          ...account,
          sender_name: (template.from_name as string) || account.sender_name,
          reply_to_email: (template.reply_to_email as string) || account.reply_to_email,
          reply_to_name: (template.reply_to_name as string) || account.reply_to_name,
        },
        { to, subject, html, text: htmlToText(html), headers },
      );
    } catch (sendError) {
      // The claim was taken on the assumption the send would happen. It
      // didn't, so release it — otherwise a single timed-out SMTP connection
      // suppresses that reminder permanently and nothing ever retries it.
      if (dedupeKey) {
        await admin
          .from("email_send_ledger")
          .delete()
          .eq("recipient", recipient)
          .eq("template_key", templateKey)
          .eq("dedupe_key", dedupeKey)
          .then(() => {}, () => {});
      }
      throw sendError;
    }

    // Sends without a dedupe key still have to count toward the cap, so the
    // ledger row is written here for them. Keyed rows were already claimed.
    if (!dedupeKey) {
      await admin
        .from("email_send_ledger")
        .insert({
          recipient,
          template_key: templateKey,
          coach_id: coachId,
          is_transactional: transactional,
        })
        .then(() => {}, () => {});
    }

    // email_logs records events, not messages: the detail goes in metadata.
    // Best-effort — a logging failure must not fail a send that already
    // reached the provider.
    await admin
      .from("email_logs")
      .insert({
        event_type: "template_sent",
        metadata: { template_key: templateKey, to, subject },
      })
      .then(() => {}, () => {});

    return json({ success: true, template_key: templateKey, sent_to: to });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    console.error("send-templated-email error:", message);
    return json({ error: message }, 500);
  }
});
