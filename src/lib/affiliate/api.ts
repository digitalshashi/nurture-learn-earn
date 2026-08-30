/**
 * The affiliate dashboard's data access.
 *
 * These five functions stand in for the endpoints the dashboard was specified
 * against — GET /api/affiliate/products, /sales, /payments, POST /click/:code,
 * GET+PUT /bank-details. This app has no API server to hang them on: the
 * Cloudflare Worker in front of the SPA only serves assets and rewrites
 * `<head>`, and every other backend behaviour in the codebase is a Postgres
 * function called through PostgREST. So each endpoint is a SECURITY DEFINER
 * RPC and this module is the seam that makes them look like endpoints.
 *
 * The important property that buys: not one of these functions takes a user
 * id. The row filter inside each is `auth.uid()`, so there is no argument a
 * caller could tamper with to read somebody else's earnings — scoping is a
 * property of the schema rather than of remembering to add a `.eq()` at every
 * call site.
 *
 * Every function fails soft and returns an empty shape. A dashboard that
 * renders zeroes with an error toast is better than one that renders nothing.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  AffiliateBankDetails,
  AffiliatePaymentsResponse,
  AffiliateProductsResponse,
  AffiliateSalesQuery,
  AffiliateSalesResponse,
  ServiceAffiliateRates,
  ServiceAffiliateStatus,
} from "./types";

const EMPTY_PRODUCTS: AffiliateProductsResponse = { affiliate_code: null, products: [] };
const EMPTY_SALES: AffiliateSalesResponse = {
  rows: [],
  totals: { count: 0, amount: 0, commission: 0 },
  limit: 25,
  offset: 0,
};
const EMPTY_PAYMENTS: AffiliatePaymentsResponse = { rows: [], totals: { paid: 0, due: 0 } };

/**
 * Narrows one jsonb result.
 *
 * The generated Supabase types widen a jsonb return to `Json`, a union that
 * includes arrays and scalars, so every one of these calls would otherwise
 * need its own cast. The shape being asserted is the jsonb_build_object in
 * 20260903000000_affiliate_dashboard.sql; `src/lib/affiliate/types.ts` is the
 * transcription of it, and the two have to be changed together.
 */
function shape<T>(data: unknown, fallback: T): T {
  return data == null ? fallback : (data as T);
}

/** GET /api/affiliate/products */
export async function fetchAffiliateProducts(): Promise<AffiliateProductsResponse> {
  const { data, error } = await supabase.rpc("affiliate_products_for_me");
  if (error) {
    console.error("affiliate_products_for_me failed:", error.message);
    return EMPTY_PRODUCTS;
  }
  return shape<AffiliateProductsResponse>(data, EMPTY_PRODUCTS);
}

/** GET /api/affiliate/sales?search=&membership=&start=&end= */
export async function fetchAffiliateSales(
  query: AffiliateSalesQuery = {},
): Promise<AffiliateSalesResponse> {
  const { data, error } = await supabase.rpc("affiliate_sales_for_me", {
    // Empty strings are not filters. Sending "" would ILIKE '%%' — harmless,
    // but sending null lets the query planner skip the predicate entirely.
    _search: query.search?.trim() || null,
    _product_id: query.productId || null,
    _start: query.start || null,
    _end: query.end || null,
    _limit: query.limit ?? 25,
    _offset: query.offset ?? 0,
  });
  if (error) {
    console.error("affiliate_sales_for_me failed:", error.message);
    return EMPTY_SALES;
  }
  return shape<AffiliateSalesResponse>(data, EMPTY_SALES);
}

/** GET /api/affiliate/payments */
export async function fetchAffiliatePayments(): Promise<AffiliatePaymentsResponse> {
  const { data, error } = await supabase.rpc("affiliate_payments_for_me");
  if (error) {
    console.error("affiliate_payments_for_me failed:", error.message);
    return EMPTY_PAYMENTS;
  }
  return shape<AffiliatePaymentsResponse>(data, EMPTY_PAYMENTS);
}

/**
 * POST /api/affiliate/click/:code
 *
 * Fire-and-forget by design: a visitor who arrives with a mangled code, or
 * while the database is unreachable, still gets the page they asked for. The
 * boolean says whether the code and checkout path both resolved, which is what
 * the caller needs to decide whether to hold the claim in storage.
 */
export async function recordAffiliateClick(
  code: string,
  checkoutPath: string,
  visitorKey: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("record_affiliate_click", {
    _code: code,
    _checkout_path: checkoutPath,
    _visitor_key: visitorKey,
  });
  if (error) {
    console.warn("affiliate click not recorded:", error.message);
    return false;
  }
  return data === true;
}

/**
 * Binds a held click to the signed-in buyer, starting the attribution window.
 *
 * Separate from the click because the two happen at different times: the click
 * is anonymous, and the claim can only be made once there is an account to
 * credit the eventual purchase to.
 */
export async function claimAffiliateAttribution(
  code: string,
  checkoutPath: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("claim_affiliate_attribution", {
    _code: code,
    _checkout_path: checkoutPath,
  });
  if (error) {
    console.warn("affiliate attribution not claimed:", error.message);
    return false;
  }
  return data === true;
}

/** GET /api/affiliate/bank-details — masked; the number never comes back. */
export async function fetchBankDetails(): Promise<AffiliateBankDetails> {
  const { data, error } = await supabase.rpc("my_affiliate_bank_details");
  if (error) {
    console.error("my_affiliate_bank_details failed:", error.message);
    return { has_details: false };
  }
  return shape<AffiliateBankDetails>(data, { has_details: false });
}

// ------------------------------------------------- per-service switch ------

/**
 * The affiliate switch on one service, as it currently stands.
 *
 * Throws rather than failing soft, unlike the dashboard reads above: this one
 * is opened by a deliberate press on a specific service, so "nothing happened"
 * would be worse than an error the dialog can show.
 */
export async function fetchServiceAffiliate(
  serviceId: string,
): Promise<{ status: ServiceAffiliateStatus | null; error: string | null }> {
  const { data, error } = await supabase.rpc("service_affiliate_status", {
    _service_id: serviceId,
  });
  if (error) return { status: null, error: error.message };
  return { status: shape<ServiceAffiliateStatus | null>(data, null), error: null };
}

/**
 * Switches affiliates on (or off) for one service and sets the rate.
 *
 * Creates the programme and the product if neither exists, so a coach never
 * has to visit a second screen before their service can be promoted. Returns
 * the same shape as the read, link included.
 */
export async function saveServiceAffiliate(input: {
  serviceId: string;
  commissionRate: number;
  active: boolean;
}): Promise<{ status: ServiceAffiliateStatus | null; error: string | null }> {
  const { data, error } = await supabase.rpc("set_service_affiliate", {
    _service_id: input.serviceId,
    _commission_rate: input.commissionRate,
    _active: input.active,
  });
  if (error) return { status: null, error: error.message };
  return { status: shape<ServiceAffiliateStatus | null>(data, null), error: null };
}

/** Every rate the caller owns, keyed by service id — one call for a whole table. */
export async function fetchServiceAffiliateRates(): Promise<ServiceAffiliateRates> {
  const { data, error } = await supabase.rpc("my_service_affiliate_rates");
  if (error) {
    console.error("my_service_affiliate_rates failed:", error.message);
    return {};
  }
  return shape<ServiceAffiliateRates>(data, {});
}

/**
 * PUT /api/affiliate/bank-details
 *
 * The values pass straight from the member's own keystrokes into the
 * encrypting function and are held nowhere else — not in a state hook that
 * outlives the dialog, not in a log line, not in a toast. The error message
 * returned by the database is deliberately generic about *which* field failed
 * validation only insofar as it never echoes what was typed.
 */
export async function saveBankDetails(input: {
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
}): Promise<{ details: AffiliateBankDetails | null; error: string | null }> {
  const { data, error } = await supabase.rpc("save_affiliate_bank_details", {
    _account_holder: input.accountHolder,
    _bank_name: input.bankName,
    _account_number: input.accountNumber,
    _ifsc_code: input.ifscCode,
  });

  if (error) {
    // Never logged: the arguments to the failing call are the account details.
    return { details: null, error: error.message };
  }
  return { details: shape<AffiliateBankDetails | null>(data, null), error: null };
}
