import { supabase } from "@/integrations/supabase/client";

/**
 * Waits for a purchase to show up, for when the browser could not confirm it.
 *
 * Two things now grant access: the buyer's own return trip, and the gateway's
 * webhook. The browser call is the fast one, but it is also the fragile one —
 * it can fail on a flaky connection or a session that expired while the buyer
 * was on the bank's page, and the money is already gone by then.
 *
 * When that happens the webhook is almost certainly on its way, so this polls
 * briefly before anything is reported as failed. Telling someone their payment
 * could not be confirmed, seconds before it lands, is the worst outcome
 * available: they call support, or worse, they pay again.
 */
export async function waitForServiceAccess(
  serviceId: string,
  userId: string,
  { attempts = 6, intervalMs = 1500 }: { attempts?: number; intervalMs?: number } = {},
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    // Wait first: the caller has just tried and failed, so an immediate read
    // would only repeat what it already knows.
    await new Promise((r) => setTimeout(r, intervalMs));

    const { data } = await supabase
      .from("service_users")
      .select("id")
      .eq("service_id", serviceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (data) return true;
  }
  return false;
}

/** What to tell a buyer whose money left but whose access has not appeared. */
export const PENDING_PAYMENT_MESSAGE =
  "Your payment may still be processing. Do not pay again — if it went through, " +
  "access will appear in your dashboard within a few minutes.";
