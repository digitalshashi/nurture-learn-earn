import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  formatCompact,
  formatCurrency,
  isCurrencyCode,
  type CurrencyCode,
  type CurrencySpec,
  type FormatOptions,
} from "@/lib/currency";

interface CurrencyContextValue {
  /** The workspace currency. Every symbol in the UI follows this. */
  currency: CurrencyCode;
  spec: CurrencySpec;
  symbol: string;
  loading: boolean;
  /** Formats in the workspace currency unless a specific one is passed. */
  format: (amount: number | null | undefined, opts?: FormatOptions) => string;
  compact: (amount: number | null | undefined) => string;
  setCurrency: (next: CurrencyCode) => Promise<void>;
  reload: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

/**
 * Makes the workspace currency available everywhere.
 *
 * Loaded once at the top of the app so a page never has to fetch it, and never
 * has to guess — the old code hardcoded "$" because there was nothing to ask.
 */
export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const coachId = user?.id;

  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!coachId) {
      // Signed out — public pages still need a sensible symbol.
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("platform_settings")
      .select("default_currency")
      .eq("coach_id", coachId)
      .maybeSingle();

    const stored = (data as { default_currency?: string } | null)?.default_currency;
    setCurrencyState(isCurrencyCode(stored) ? stored : DEFAULT_CURRENCY);
    setLoading(false);
  }, [coachId]);

  useEffect(() => {
    load();
  }, [load]);

  const setCurrency = useCallback(
    async (next: CurrencyCode) => {
      if (!coachId) return;
      // Optimistic: the whole UI re-renders in the new currency immediately.
      const previous = currency;
      setCurrencyState(next);

      const { error } = await supabase.from("platform_settings").upsert(
        { coach_id: coachId, default_currency: next, updated_at: new Date().toISOString() },
        { onConflict: "coach_id" },
      );

      if (error) {
        setCurrencyState(previous);
        throw error;
      }
    },
    [coachId, currency],
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      spec: CURRENCIES[currency],
      symbol: CURRENCIES[currency].symbol,
      loading,
      format: (amount, opts) => formatCurrency(amount, currency, opts),
      compact: (amount) => formatCompact(amount, currency),
      setCurrency,
      reload: load,
    }),
    [currency, loading, setCurrency, load],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

/**
 * Workspace currency and formatters.
 *
 * Safe outside the provider: public pages such as checkout render before any
 * session exists, and should show the default rather than crash.
 */
export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (ctx) return ctx;

  return {
    currency: DEFAULT_CURRENCY,
    spec: CURRENCIES[DEFAULT_CURRENCY],
    symbol: CURRENCIES[DEFAULT_CURRENCY].symbol,
    loading: false,
    format: (amount, opts) => formatCurrency(amount, DEFAULT_CURRENCY, opts),
    compact: (amount) => formatCompact(amount, DEFAULT_CURRENCY),
    setCurrency: async () => {},
    reload: async () => {},
  };
}
