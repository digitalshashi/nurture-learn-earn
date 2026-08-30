/**
 * Carrying a referral from the click to the signup.
 *
 * These are minutes or days apart: someone taps a friend's link, reads the
 * landing page, closes it, and comes back on Thursday to sign up. Nothing on
 * the server can connect those two events, so the code has to wait in the
 * visitor's own browser until there is an account to attach it to.
 *
 * Every read and write is wrapped: storage throws outright in some privacy
 * modes, and a referral that cannot be remembered must degrade to "no
 * referral", never to a broken signup form.
 */

const CODE_KEY = "referral:pending";
const VISITOR_KEY = "referral:visitor";

/** Codes are minted uppercase and get typed in by hand, so compare them loosely. */
export function normaliseCode(raw: string | null | undefined): string {
  return (raw ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
}

interface PendingReferral {
  code: string;
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
    /* Private mode, or storage disabled. The referral is simply not remembered. */
  }
}

/**
 * A stable random id for this browser.
 *
 * Deduplicates clicks — a refresh is not a second visitor — and lets a signup
 * be tied back to the visit that brought it. It identifies a browser, not a
 * person: no account, no address, nothing that outlives clearing site data.
 */
export function visitorKey(): string {
  const existing = readStorage(VISITOR_KEY);
  if (existing) return existing;

  const fresh =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  writeStorage(VISITOR_KEY, fresh);
  return fresh;
}

/** Holds the code until the visitor signs up, or until the window closes. */
export function rememberReferral(code: string, attributionDays = 30): void {
  const normalised = normaliseCode(code);
  if (!normalised) return;
  const pending: PendingReferral = {
    code: normalised,
    expiresAt: Date.now() + attributionDays * 86_400_000,
  };
  writeStorage(CODE_KEY, JSON.stringify(pending));
}

/**
 * The code to attach to a signup happening now, if there is a live one.
 *
 * An expired or malformed entry reads as absent rather than throwing, so a
 * stale value left by an older build cannot break the signup form.
 */
export function pendingReferralCode(): string | null {
  const raw = readStorage(CODE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingReferral>;
    if (typeof parsed?.code !== "string" || typeof parsed?.expiresAt !== "number") return null;
    if (parsed.expiresAt <= Date.now()) return null;
    return normaliseCode(parsed.code) || null;
  } catch {
    return null;
  }
}

/** Called once the signup has carried the code, so it cannot attach twice. */
export function clearPendingReferral(): void {
  try {
    window.localStorage.removeItem(CODE_KEY);
  } catch {
    /* Nothing to clear if storage was never available. */
  }
}

/** The short link a member shares. */
export function referralUrl(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, "")}/r/${normaliseCode(code)}`;
}

/**
 * Pulls a code out of a URL, accepting both forms people actually paste:
 * the short `/r/CODE` path and a `?ref=CODE` query on any page.
 */
export function codeFromLocation(pathname: string, search: string): string | null {
  const fromQuery = new URLSearchParams(search).get("ref");
  if (fromQuery) return normaliseCode(fromQuery) || null;

  const match = /^\/r\/([^/?#]+)/.exec(pathname);
  return match ? normaliseCode(match[1]) || null : null;
}
