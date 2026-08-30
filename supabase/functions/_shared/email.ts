// Shared email sending, so every function that needs to put a message in
// someone's inbox goes through one provider dispatch.

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

export interface EmailAccount {
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

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  /**
   * The plain-text half of a multipart/alternative message.
   *
   * An HTML-only body is one of the oldest spam heuristics there is: real mail
   * clients have sent both parts for thirty years, and bulk senders that skip
   * the text part stand out. Derived from the HTML when a caller doesn't
   * supply one, so no send is ever HTML-only.
   */
  text?: string;
  /** Extra RFC 5322 headers — List-Unsubscribe and friends. */
  headers?: Record<string, string>;
}

/** Providers this codebase can actually send through. */
export const SENDABLE_PROVIDERS = ["smtp", "ses", "resend", "mailersend"];

export async function sendEmail(account: EmailAccount, mail: OutgoingEmail): Promise<void> {
  const fromName = account.sender_name;
  const fromEmail = account.sender_email;
  const replyToEmail = account.reply_to_email || fromEmail;
  const { to, subject, html, headers } = mail;
  const text = mail.text ?? htmlToText(html);

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
      await client.send({
        from: `${fromName} <${fromEmail}>`,
        to,
        replyTo: replyToEmail,
        subject,
        content: text,
        html,
        ...(headers ? { headers } : {}),
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
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        reply_to: replyToEmail,
        subject,
        html,
        text,
        ...(headers ? { headers } : {}),
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
        from: { email: fromEmail, name: fromName },
        to: [{ email: to }],
        reply_to: { email: replyToEmail, name: fromName },
        subject,
        html,
        text,
        // MailerSend takes custom headers as a list of pairs, not an object,
        // and silently drops them on plans below Professional. Harmless where
        // unsupported; correct where it is.
        ...(headers
          ? { headers: Object.entries(headers).map(([name, value]) => ({ name, value })) }
          : {}),
      }),
    });
    if (!res.ok) throw new Error(`MailerSend send failed: ${res.status} ${await res.text()}`);
    return;
  }

  throw new Error(
    `Sending isn't supported yet for provider "${account.provider}". Supported: SMTP, Amazon SES, Resend, MailerSend.`,
  );
}

/**
 * Substitutes {{variable}} placeholders.
 *
 * Values are HTML-escaped: template bodies are HTML, and a name containing
 * "<script>" would otherwise execute in the recipient's client.
 */
export function renderTemplate(body: string, vars: Record<string, string>): string {
  const escape = (v: string) =>
    v
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (whole, key: string) => {
    const value = vars[key];
    return value === undefined ? whole : escape(value);
  });
}

// The pure half of the send rules lives in emailHygiene.ts so the app's test
// suite can import it — this module pulls an SMTP client over the network,
// which makes it unloadable outside Deno. Re-exported here so callers still
// have one place to import from.
export {
  htmlToText,
  isTransactionalTemplate,
  TRANSACTIONAL_TEMPLATE_KEYS,
} from "./emailHygiene.ts";

import {
  signUnsubscribeToken as sign,
  verifyUnsubscribeToken as verify,
} from "./emailHygiene.ts";

/** The secret unsubscribe links are signed with. */
const unsubscribeSecret = () =>
  Deno.env.get("UNSUBSCRIBE_TOKEN_SECRET") || Deno.env.get("INTERNAL_FUNCTION_SECRET") || "";

export const signUnsubscribeToken = (email: string, coachId: string | null) =>
  sign(unsubscribeSecret(), email, coachId);

export const verifyUnsubscribeToken = (email: string, coachId: string | null, token: string) =>
  verify(unsubscribeSecret(), email, coachId, token);

/** The one-click endpoint and the human-facing page for an address. */
export async function unsubscribeUrls(
  email: string,
  coachId: string | null,
): Promise<{ oneClick: string; page: string } | null> {
  const token = await signUnsubscribeToken(email, coachId);
  if (!token) return null;
  const base = (Deno.env.get("SUPABASE_URL") || "").replace(/\/+$/, "");
  if (!base) return null;
  const q = `e=${encodeURIComponent(email.trim().toLowerCase())}` +
    `&c=${encodeURIComponent(coachId ?? "")}&t=${encodeURIComponent(token)}`;
  const url = `${base}/functions/v1/unsubscribe?${q}`;
  return { oneClick: url, page: url };
}

/**
 * Whether this address has opted out.
 *
 * Two scopes: a row with no coach is a platform-wide opt-out (the person wants
 * nothing from anyone), a row with a coach is that one workspace. A white-label
 * tenant unsubscribing must not silence the other tenants a learner belongs to,
 * which is why this is not a single global flag on the profile.
 */
export async function isSuppressed(
  admin: { from: (t: string) => any },
  email: string,
  coachId: string | null,
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  let query = admin.from("email_unsubscribed").select("id, coach_id").eq("email", normalized);
  query = coachId ? query.or(`coach_id.is.null,coach_id.eq.${coachId}`) : query.is("coach_id", null);
  const { data, error } = await query.limit(1);
  // Fail open: a database hiccup must not silently stop a receipt. The other
  // guards (frequency cap, transactional allowlist) still apply.
  if (error) {
    console.error("suppression check failed:", error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/**
 * Picks the sender account for a purpose.
 *
 * Falls back through: the account explicitly routed to this purpose, then the
 * coach's default, then any verified account they own. Without a fallback a
 * coach who never configured routing would silently send nothing.
 */
export async function resolveSenderAccount(
  admin: { from: (t: string) => any },
  coachId: string,
  purpose: string,
): Promise<EmailAccount | null> {
  const { data: assignment } = await admin
    .from("email_account_assignments")
    .select("account_id")
    .eq("coach_id", coachId)
    .eq("purpose", purpose)
    .maybeSingle();

  if (assignment?.account_id) {
    const { data } = await admin
      .from("email_accounts")
      .select("*")
      .eq("id", assignment.account_id)
      .maybeSingle();
    if (data) return data as EmailAccount;
  }

  const { data: fallback } = await admin
    .from("email_accounts")
    .select("*")
    .eq("coach_id", coachId)
    .order("is_default", { ascending: false })
    .order("is_verified", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (fallback as EmailAccount) ?? null;
}

/**
 * Fires a stored template through send-templated-email.
 *
 * Deliberately never throws: a receipt failing to send must not roll back a
 * payment that already succeeded. Failures are logged and swallowed.
 */
export async function sendTemplatedEmail(opts: {
  templateKey: string;
  to: string;
  coachId?: string | null;
  variables: Record<string, string>;
  /**
   * Identifies the occasion, so the same one cannot be mailed about twice.
   *
   * A scheduled run that overlaps its predecessor, a webhook a gateway retries,
   * a cron that fires twice after a deploy — each of those sends a second copy
   * of a mail the recipient already has. Passing something stable and specific
   * ("event-reminder:<event id>:<user id>") makes the second attempt a no-op.
   */
  dedupeKey?: string;
}): Promise<void> {
  const secret = Deno.env.get("INTERNAL_FUNCTION_SECRET");
  if (!secret) {
    console.warn("INTERNAL_FUNCTION_SECRET not set — skipping", opts.templateKey);
    return;
  }

  try {
    const res = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-templated-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": secret,
        },
        body: JSON.stringify({
          template_key: opts.templateKey,
          to: opts.to,
          coach_id: opts.coachId ?? null,
          variables: opts.variables,
          dedupe_key: opts.dedupeKey ?? null,
        }),
      },
    );
    if (!res.ok) {
      console.error(`${opts.templateKey} send failed:`, res.status, await res.text());
    }
  } catch (err) {
    console.error(`${opts.templateKey} send threw:`, err);
  }
}

/** Mirrors src/lib/currency.ts so an email reads the same as the app. */
const CURRENCY = {
  INR: { symbol: "₹", locale: "en-IN" },
  EUR: { symbol: "€", locale: "de-DE" },
  USD: { symbol: "$", locale: "en-US" },
} as const;

export type CurrencyCode = keyof typeof CURRENCY;

export const currencySymbol = (code: string | null | undefined): string =>
  CURRENCY[(code as CurrencyCode) ?? "INR"]?.symbol ?? CURRENCY.INR.symbol;

/**
 * Formats money for an email body.
 *
 * Templates used to receive a bare number, so a receipt read "1499" or,
 * where a symbol was hardcoded, the wrong one entirely.
 */
export function formatMoneyForEmail(
  amount: number | string | null | undefined,
  code: string | null | undefined,
): string {
  const spec = CURRENCY[(code as CurrencyCode) ?? "INR"] ?? CURRENCY.INR;
  const value = Number(amount);
  const safe = Number.isFinite(value) ? value : 0;
  return spec.symbol + safe.toLocaleString(spec.locale, {
    minimumFractionDigits: Number.isInteger(safe) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** The workspace currency for a coach, defaulting to INR. */
export async function coachCurrency(
  admin: { from: (t: string) => any },
  coachId: string | null,
): Promise<string> {
  if (!coachId) return "INR";
  const { data } = await admin
    .from("platform_settings")
    .select("default_currency")
    .eq("coach_id", coachId)
    .maybeSingle();
  return data?.default_currency ?? "INR";
}
