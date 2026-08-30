/**
 * Notices a referral code in the address bar, wherever it appears.
 *
 * Mounted once, at the app root, because a shared link does not always land
 * on the page you built for it: people paste `/r/CODE`, but they also forward
 * `…/courses?ref=CODE` out of their own address bar. Both have to count, and
 * both have to count *before* the visitor navigates away.
 *
 * Recording the click is fire-and-forget on purpose. A visitor who arrives
 * with a bad code, or while the database is unreachable, still gets the page
 * they asked for.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { codeFromLocation, rememberReferral, visitorKey } from "@/lib/referral";

export function useReferralCapture(): void {
  const location = useLocation();
  // One recording per code per page-load; React 18 mounts effects twice in
  // development and every navigation re-runs this.
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    const code = codeFromLocation(location.pathname, location.search);
    if (!code || seen.current.has(code)) return;
    seen.current.add(code);

    // Held immediately, so the attribution survives even if the network call
    // below never lands.
    rememberReferral(code);

    void supabase
      .rpc("record_referral_visit", { _code: code, _visitor_key: visitorKey() })
      .then(({ error }) => {
        if (error) console.warn("referral visit not recorded:", error.message);
      });
  }, [location.pathname, location.search]);
}
