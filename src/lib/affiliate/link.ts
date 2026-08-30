/**
 * Affiliate links: composing them, reading them back, and holding one between
 * the click and the purchase.
 *
 * An affiliate code is a referral code — the same six characters, minted by the
 * same function. That is deliberate: a member has one identity across both
 * programmes, so a link already sent out keeps working and the two dashboards
 * can never disagree about who somebody is. Everything here therefore reuses
 * `@/lib/referral` for the code alphabet and the visitor key rather than
 * defining a parallel set that could drift.
 *
 * The storage half exists for the same reason the referral half does: a click
 * and a purchase are minutes or days apart, nothing on the server connects
 * them, and the claim has to wait in the visitor's own browser until there is
 * an account to attach it to. Every read and write is wrapped — storage throws
 * outright in some privacy modes, and an unrecorded attribution must degrade to
 * "no commission", never to a broken checkout.
 */
import { normaliseCode } from "@/lib/referral";

const PENDING_KEY = "affiliate:pending";

/** The query parameter an affiliate link carries. */
export const AFFILIATE_PARAM = "affiliate";

export interface PendingAffiliate {
  code: string;
  /** The checkout path the click landed on; the server resolves the product from it. */
  path: string;
  /** Epoch ms. Past this, the click no longer counts. */
  expiresAt: number;
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Private mode, or storage disabled. The claim is simply not remembered. */
  }
}

/**
 * The affiliate code in a URL, if there is one.
 *
 * Only the query form is accepted, because that is the only form an affiliate
 * link takes: `/checkout/thing?affiliate=ABC123`. A `/r/CODE` path is a
 * referral link and belongs to the other capture hook.
 */
export function affiliateCodeFromSearch(search: string): string | null {
  const raw = new URLSearchParams(search).get(AFFILIATE_PARAM);
  return raw ? normaliseCode(raw) || null : null;
}

/**
 * The path half of an affiliate link, with the query stripped.
 *
 * This is what `affiliate_products.checkout_base_url` is compared against, so
 * a trailing slash has to go: `/checkout/thing/` and `/checkout/thing` are the
 * same page to the router but not to a string equality test in Postgres.
 */
export function checkoutPath(pathname: string): string {
  const trimmed = pathname.split("?")[0].split("#")[0];
  return trimmed.length > 1 ? trimmed.replace(/\/+$/, "") : trimmed;
}

/**
 * The absolute link a member copies.
 *
 * Stored relative and made absolute here, because this platform serves
 * white-label domains: the correct origin is whichever one the member is
 * looking at, not whichever one happened to be current when the row was
 * written.
 */
export function absoluteAffiliateUrl(origin: string, relative: string | null | undefined): string {
  if (!relative) return "";
  const base = origin.replace(/\/+$/, "");
  return relative.startsWith("http") ? relative : `${base}${relative}`;
}

/** Holds the claim until the visitor is signed in and can be attributed. */
export function rememberAffiliate(code: string, path: string, attributionDays = 30): void {
  const normalised = normaliseCode(code);
  if (!normalised || !path) return;
  const pending: PendingAffiliate = {
    code: normalised,
    path: checkoutPath(path),
    expiresAt: Date.now() + attributionDays * 86_400_000,
  };
  writeStorage(PENDING_KEY, JSON.stringify(pending));
}

/**
 * The claim to attach to a purchase happening now, if there is a live one.
 *
 * An expired or malformed entry reads as absent rather than throwing, so a
 * stale value left by an older build cannot break checkout.
 */
export function pendingAffiliate(): PendingAffiliate | null {
  const raw = readStorage(PENDING_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingAffiliate>;
    if (
      typeof parsed?.code !== "string" ||
      typeof parsed?.path !== "string" ||
      typeof parsed?.expiresAt !== "number"
    ) {
      return null;
    }
    if (parsed.expiresAt <= Date.now()) return null;
    const code = normaliseCode(parsed.code);
    return code ? { code, path: parsed.path, expiresAt: parsed.expiresAt } : null;
  } catch {
    return null;
  }
}

/** Called once the claim has been recorded server-side, so it cannot claim twice. */
export function clearPendingAffiliate(): void {
  try {
    window.localStorage.removeItem(PENDING_KEY);
  } catch {
    /* Nothing to clear if storage was never available. */
  }
}

/**
 * What a stored bank account is allowed to look like on screen.
 *
 * The last four digits are the only part that ever leaves the database, so
 * this is the whole of what can be shown. It is enough for a member to
 * recognise which of their accounts they entered and useless to anybody else.
 */
export function maskAccount(last4: string | null | undefined): string {
  const digits = (last4 ?? "").replace(/\D/g, "").slice(-4);
  return digits ? `•••• ${digits}` : "••••";
}

/**
 * The commission a sale of this size earns.
 *
 * Zero when the rate is zero rather than a rounded-away fraction, so a product
 * with no commission configured shows a clean nothing instead of "₹0.004".
 */
export function commissionFor(amount: number, rate: number): number {
  if (!Number.isFinite(amount) || !Number.isFinite(rate) || rate <= 0) return 0;
  return (amount * rate) / 100;
}
