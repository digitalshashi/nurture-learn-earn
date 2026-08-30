/**
 * The member's payout account, as much of it as anyone is allowed to see.
 *
 * What comes back is the masked summary — holder, bank, last four digits —
 * because the account number and IFSC are encrypted at rest and no RPC a
 * browser can call will return them. `has_details` is what the warning banner
 * keys off, and is a generated column rather than a client-side guess at
 * whether the fields look filled in.
 */
import { useEffect, useState } from "react";
import { fetchBankDetails } from "@/lib/affiliate/api";
import type { AffiliateBankDetails } from "@/lib/affiliate/types";

export function useBankDetails() {
  const [details, setDetails] = useState<AffiliateBankDetails>({ has_details: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchBankDetails().then((next) => {
      if (cancelled) return;
      setDetails(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { details, setDetails, loading };
}
