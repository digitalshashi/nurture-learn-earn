/**
 * The one definition of how money is written in this app.
 *
 * Symbols used to be hardcoded per screen — usually "$", sometimes a
 * `currency === "USD" ? "$" : "₹"` ternary — so a workspace pricing in rupees
 * still showed dollars in most of the product. Everything formats through here
 * instead.
 */

export const SUPPORTED_CURRENCIES = ["INR", "EUR", "USD"] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

/** Indian rupee: the default, because the platform's audience prices in it. */
export const DEFAULT_CURRENCY: CurrencyCode = "INR";

export interface CurrencySpec {
  code: CurrencyCode;
  symbol: string;
  label: string;
  /** Locale used for grouping — Indian numbering groups differently (1,23,456). */
  locale: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencySpec> = {
  INR: { code: "INR", symbol: "₹", label: "Indian Rupee", locale: "en-IN" },
  EUR: { code: "EUR", symbol: "€", label: "Euro", locale: "de-DE" },
  USD: { code: "USD", symbol: "$", label: "US Dollar", locale: "en-US" },
};

export const isCurrencyCode = (v: unknown): v is CurrencyCode =>
  typeof v === "string" && (SUPPORTED_CURRENCIES as readonly string[]).includes(v);

/** Falls back to the default rather than rendering an unknown code. */
export const currencyOf = (code: unknown): CurrencySpec =>
  isCurrencyCode(code) ? CURRENCIES[code] : CURRENCIES[DEFAULT_CURRENCY];

export const symbolFor = (code: unknown): string => currencyOf(code).symbol;

export interface FormatOptions {
  /** Drop the decimals — useful for KPI tiles and axis labels. */
  compact?: boolean;
  /** Omit the symbol entirely. */
  bare?: boolean;
  /** Always show two decimals. Ledger amounts need the cents; KPI tiles do not. */
  precise?: boolean;
}

/**
 * Formats an amount in the given currency.
 *
 * Grouping follows the currency's own locale, so ₹1,23,456 reads correctly in
 * India while $123,456 reads correctly in the US.
 */
export function formatCurrency(
  amount: number | null | undefined,
  code: unknown = DEFAULT_CURRENCY,
  { compact = false, bare = false, precise = false }: FormatOptions = {},
): string {
  const spec = currencyOf(code);
  const value = Number(amount);
  const safe = Number.isFinite(value) ? value : 0;

  const digits = precise ? 2 : compact || Number.isInteger(safe) ? 0 : 2;
  const formatted = safe.toLocaleString(spec.locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

  return bare ? formatted : `${spec.symbol}${formatted}`;
}

/** Shortens large figures for tiles and chart axes: ₹1.2L, $45.6K. */
export function formatCompact(amount: number | null | undefined, code: unknown = DEFAULT_CURRENCY): string {
  const spec = currencyOf(code);
  const value = Number(amount);
  const safe = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(safe);
  const sign = safe < 0 ? "-" : "";

  // Indian numbering uses lakh and crore rather than K/M, which is what the
  // people reading these numbers actually expect.
  if (spec.code === "INR") {
    if (abs >= 10_000_000) return `${sign}${spec.symbol}${(abs / 10_000_000).toFixed(1)}Cr`;
    if (abs >= 100_000) return `${sign}${spec.symbol}${(abs / 100_000).toFixed(1)}L`;
    if (abs >= 1_000) return `${sign}${spec.symbol}${(abs / 1_000).toFixed(1)}K`;
    return `${sign}${spec.symbol}${abs.toFixed(0)}`;
  }

  if (abs >= 1_000_000) return `${sign}${spec.symbol}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${spec.symbol}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${spec.symbol}${abs.toFixed(0)}`;
}
