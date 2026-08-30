/**
 * Notices an affiliate link in the address bar, and turns it into a claim.
 *
 * Mounted once at the app root, beside useReferralCapture, because the two
 * answer different links: `/r/CODE` invites somebody to join, while
 * `/checkout/thing?affiliate=CODE` sends a buyer at one specific product. Only
 * the second earns a commission, and only the second needs to know which
 * product was being promoted.
 *
 * There are two server calls here and they happen at different moments, which
 * is the whole difficulty of affiliate attribution:
 *
 *   1. The click, recorded immediately and anonymously. This is what the
 *      "Link Clicks" number counts, and most of these never become anything.
 *   2. The claim, which can only be made once there is an account to credit a
 *      future purchase to — often on a later page load, after the visitor has
 *      signed up or logged in. Until it runs the click pays nobody.
 *
 * Both are fire-and-forget. A visitor who arrives with a mangled code, or
 * while the database is unreachable, still gets the page they asked for.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { visitorKey } from "@/lib/referral";
import {
  affiliateCodeFromSearch,
  checkoutPath,
  clearPendingAffiliate,
  pendingAffiliate,
  rememberAffiliate,
} from "@/lib/affiliate/link";
import { claimAffiliateAttribution, recordAffiliateClick } from "@/lib/affiliate/api";

export function useAffiliateCapture(): void {
  const location = useLocation();
  const { user } = useAuth();

  // One recording per code+path per page-load; React 18 mounts effects twice
  // in development and every navigation re-runs this.
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    const code = affiliateCodeFromSearch(location.search);
    if (!code) return;

    const path = checkoutPath(location.pathname);
    const key = `${code}@${path}`;
    if (seen.current.has(key)) return;
    seen.current.add(key);

    // Held before the network call, so the attribution survives even if the
    // call never lands.
    rememberAffiliate(code, path);
    void recordAffiliateClick(code, path, visitorKey());
  }, [location.pathname, location.search]);

  // The claim, retried on every navigation until it sticks. Cheap: it only
  // fires while there is both a signed-in user and an unclaimed click held in
  // this browser, and the successful claim clears the second condition.
  useEffect(() => {
    if (!user) return;
    const pending = pendingAffiliate();
    if (!pending) return;

    let cancelled = false;
    void claimAffiliateAttribution(pending.code, pending.path).then((claimed) => {
      // Only a confirmed claim clears the record. A network failure leaves it
      // in place to be retried, rather than silently losing the commission.
      if (claimed && !cancelled) clearPendingAffiliate();
    });

    return () => {
      cancelled = true;
    };
  }, [user, location.pathname]);
}
