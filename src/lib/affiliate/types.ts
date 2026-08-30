/**
 * The shapes the affiliate RPCs return.
 *
 * These mirror the jsonb built in 20260903000000_affiliate_dashboard.sql. They
 * are hand-written rather than generated because the generated Supabase types
 * describe an RPC returning `Json`, which tells a caller nothing — and the
 * dashboard reads a dozen fields off each of these.
 */

export interface AffiliateProduct {
  id: string;
  name: string;
  /** Percent. The card reads "Commission Rate: {rate}% of Actual Earning". */
  commission_rate: number;
  commission_basis: "actual_earning";
  /** Relative; the browser prefixes its own origin. */
  checkout_base_url: string;
  affiliate_code: string | null;
  /** Relative too, already composed as `${checkout_base_url}?affiliate=${code}`. */
  full_url: string | null;
  clicks: number;
  sales_count: number;
  sales_amount: number;
  commission_amount: number;
}

export interface AffiliateProductsResponse {
  affiliate_code: string | null;
  products: AffiliateProduct[];
}

export interface AffiliateSale {
  id: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  membership_name: string;
  product_id: string | null;
  coupon_code: string | null;
  amount_paid: number;
  commission_earned: number;
  purchased_at: string;
}

export interface AffiliateSalesResponse {
  rows: AffiliateSale[];
  /** Over the whole filtered set, not the current page. */
  totals: { count: number; amount: number; commission: number };
  limit: number;
  offset: number;
}

export interface AffiliateSalesQuery {
  search?: string;
  productId?: string | null;
  /** ISO date, `yyyy-mm-dd`. Inclusive at both ends. */
  start?: string | null;
  end?: string | null;
  limit?: number;
  offset?: number;
}

export type PayoutStatus = "not_paid" | "paid" | "pending";

export interface AffiliatePayout {
  id: string;
  created_at: string;
  membership_name: string;
  /** The sales total the commission was calculated from; shown under the name. */
  sales_amount: number;
  commission_amount: number;
  status: PayoutStatus;
  remark: string | null;
}

export interface AffiliatePaymentsResponse {
  rows: AffiliatePayout[];
  totals: { paid: number; due: number };
}

/** The caller's own link for one product. */
export interface AffiliateLinkSummary {
  product_id: string;
  name: string;
  affiliate_code: string | null;
  full_url: string | null;
  clicks: number;
}

/**
 * The affiliate switch on a single service.
 *
 * `enabled` is false and there is no `product_id` until a coach has set a rate
 * — that is the state every service starts in, and the dialog's job is to get
 * it out of that state in one press.
 */
export interface ServiceAffiliateStatus {
  service_id: string;
  title: string;
  enabled: boolean;
  commission_rate: number;
  product_id?: string | null;
  checkout_base_url?: string | null;
  link?: AffiliateLinkSummary | null;
  /** How many people hold a link for it, across the whole platform. */
  affiliates?: number;
  clicks?: number;
  sales_count?: number;
  commission_total?: number;
}

/** service id -> its rate, for badging the Services table without a query per row. */
export type ServiceAffiliateRates = Record<
  string,
  { enabled: boolean; commission_rate: number }
>;

/**
 * What the browser is allowed to know about stored bank details.
 *
 * There is no account number or IFSC field here, and that is the point: they
 * are encrypted at rest and never returned by any RPC a browser can call.
 */
export interface AffiliateBankDetails {
  has_details: boolean;
  account_holder?: string | null;
  bank_name?: string | null;
  /** The last four digits, the only part that ever leaves the database. */
  account_last4?: string | null;
  updated_at?: string | null;
}
