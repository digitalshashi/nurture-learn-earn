// The rules that decide how an email is allowed to reach someone.
//
// Split out of email.ts for the same reason notifications.ts is separate: that
// module imports an SMTP client over the network, so nothing that imports it
// can be loaded by the app's test suite. Everything here is pure — no Deno
// APIs, no remote imports, no environment — so the behaviour that decides
// whether a person gets mailed is actually covered by tests rather than
// verified by sending real mail to a real inbox and hoping.

/**
 * Templates that must reach the inbox even when someone has unsubscribed.
 *
 * The line is not "important" — everything feels important to whoever wrote
 * it. It is: money, security, account access, and commitments the person
 * actually made. Withholding a receipt for money that just left someone's
 * account is a compliance problem; withholding "your session tomorrow is
 * cancelled" means they turn up to a cancelled session. Neither is something
 * an opt-out from course digests should ever cause.
 *
 * Everything not listed here is suppressible, and that default is deliberate:
 * a template added later is treated as marketing until someone decides
 * otherwise, which is the safe direction to be wrong in.
 */
export const TRANSACTIONAL_TEMPLATE_KEYS = new Set([
  // Account and security.
  "login_otp",
  "password_reset",
  "account_created",
  "team_invite",

  // Money, and notice before money moves.
  "payment_receipt",
  "payment_failed",
  "refund_processed",
  "service_purchase_confirmed",
  "sale_notification",
  "subscription_renewal_reminder",
  "subscription_expired",

  // Confirmations of something the person chose to do, and changes to it.
  // A reminder about a booking is marketing-adjacent; a cancellation is not.
  "course_enrollment",
  "event_registration_confirmed",
  "consultation_booked",
  "consultation_cancelled",
  "workshop_cancelled",
  "workshop_rescheduled",

  // Something they earned and may need as a record.
  "certificate_issued",
]);

export const isTransactionalTemplate = (key: string): boolean =>
  TRANSACTIONAL_TEMPLATE_KEYS.has(key);

/**
 * A readable plain-text rendering of an HTML body.
 *
 * Not a general HTML-to-text engine — it only has to handle our own templates,
 * which are table-based transactional layouts. It drops the invisible parts
 * (head, style, preheader), keeps link targets so a text-only reader can still
 * act on the mail, and collapses the whitespace that nested tables leave
 * behind.
 *
 * The reason this exists at all: a message with no text/plain part is one of
 * the oldest spam heuristics there is. Real mail has carried both halves for
 * thirty years, and bulk senders that skip it stand out to exactly the filters
 * we are trying not to trip.
 */
/** The named entities our templates actually use. */
const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&copy;": "(c)",
  "&reg;": "(r)",
  "&trade;": "(tm)",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
  "&lsquo;": "'",
  "&rsquo;": "'",
  "&ldquo;": '"',
  "&rdquo;": '"',
};

export function htmlToText(html: string): string {
  // One pass, so nothing a replacement produces is read as markup again. A
  // chain of .replace() calls cannot do this: a catch-all for unknown entities
  // consumes "&amp;" before the rule for it runs, and reordering only moves
  // the problem — "&amp;lt;" then decodes twice and becomes a "<" that was
  // never in the message.
  const unescape = (s: string) =>
    s.replace(/&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|[a-zA-Z][a-zA-Z0-9]*);/g, (whole, dec, hex) => {
      const code = dec ? Number(dec) : hex ? parseInt(hex, 16) : NaN;
      if (Number.isFinite(code) && code > 0 && code <= 0x10ffff) {
        try {
          return String.fromCodePoint(code);
        } catch {
          return " ";
        }
      }
      // Anything unrecognised becomes a space rather than being left as a raw
      // "&thinsp;" in what is supposed to be readable prose.
      return ENTITIES[whole.toLowerCase()] ?? " ";
    });

  return unescape(
    html
      // Anything the recipient was never meant to read. The preheader is a
      // hidden div rather than a tag, so it is handled by the caller's markup
      // rather than here.
      .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      // Keep the destination of a link, which is the whole point of the mail
      // for anything with a call to action.
      .replace(
        /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
        (_m, href: string, label: string) => {
          const clean = label.replace(/<[^>]+>/g, "").trim();
          if (!clean) return href;
          return /^https?:/i.test(href) ? `${clean} (${href})` : clean;
        },
      )
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|tr|h[1-6]|li|table)>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Signs "this address, this workspace" with the given secret.
 *
 * The link in a footer has to work without a session — the whole point is that
 * someone who no longer wants the mail can act on it in one click, from an
 * email client, months later. An unsigned link would let anyone unsubscribe
 * anyone else by editing a query string, and a guessable one would let someone
 * walk the user table.
 *
 * Takes the secret as an argument rather than reading the environment so this
 * stays pure and testable; the Deno side supplies it.
 */
export async function signUnsubscribeToken(
  secret: string,
  email: string,
  coachId: string | null,
): Promise<string> {
  if (!secret) return "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  // The newline is a separator that cannot appear in either field, so
  // ("a@b.com", "c") and ("a@b.co", "mc") cannot collide onto one signature.
  const payload = `${email.trim().toLowerCase()}\n${coachId ?? ""}`;
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  return btoa(String.fromCharCode(...sig))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function verifyUnsubscribeToken(
  secret: string,
  email: string,
  coachId: string | null,
  token: string,
): Promise<boolean> {
  const expected = await signUnsubscribeToken(secret, email, coachId);
  if (!expected || !token || expected.length !== token.length) return false;
  // Constant-time compare: no early exit that would leak where it diverged.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}
