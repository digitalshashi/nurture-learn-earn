import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Transaction, Withdrawal } from "@/lib/sales";

/**
 * Loads the ledger once for whichever Sales page needs it.
 *
 * All four pages read the same rows so their totals cannot disagree — Earnings
 * showing one number while Withdrawals computes another was the failure mode
 * worth designing out.
 */
export function useSalesData() {
  const { user } = useAuth();
  const coachId = user?.id;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!coachId) return;
    setLoading(true);
    setError(null);

    const [txnRes, wdRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .eq("coach_id", coachId)
        .order("occurred_at", { ascending: false }),
      supabase
        .from("withdrawals")
        .select("*")
        .eq("coach_id", coachId)
        .order("requested_at", { ascending: false }),
    ]);

    if (txnRes.error || wdRes.error) {
      setError(txnRes.error?.message || wdRes.error?.message || "Could not load sales data");
    }

    setTransactions((txnRes.data as unknown as Transaction[]) || []);
    setWithdrawals((wdRes.data as unknown as Withdrawal[]) || []);
    setLoading(false);
  }, [coachId]);

  useEffect(() => {
    if (coachId) load();
  }, [coachId, load]);

  return { coachId, transactions, withdrawals, loading, error, reload: load };
}
