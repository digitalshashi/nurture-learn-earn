// Shared helpers for the payment edge functions.
//
// Everything that decides whether money was really received, and everything
// that happens once it was, lives here — so the browser return trip and the
// gateway webhook fulfil a payment through exactly the same code and cannot
// drift apart or double-fulfil each other.

import { adminClient } from "./edge.ts";
import { sendTemplatedEmail } from "./email.ts";
export { corsHeaders, json, optionalUser, requireUser } from "./edge.ts";
export { adminClient };

type Admin = ReturnType<typeof adminClient>;

export type Provider = "razorpay" | "instamojo";

export const PROVIDERS: Provider[] = ["razorpay", "instamojo"];

export const isProvider = (v: unknown): v is Provider =>
  typeof v === "string" && (PROVIDERS as string[]).includes(v);

export interface GatewayConfig {
  provider: Provider;
  key_id: string;
  key_secret: string;
  salt: string | null;
  webhook_secret: string | null;
  environment: "live" | "test";
  currency: string;
}

/** A recorded intent to pay. See the payment_orders migration for why. */
export interface PaymentOrder {
  id: string;
  coach_id: string;
  service_id: string;
  /** Null until fulfilment, for someone who bought without an account. */
  user_id: string | null;
  provider: Provider;
  gateway_order_id: string;
  gateway_payment_id: string | null;
  amount: number;
  currency: string;
  status: "created" | "paid" | "failed" | "refunded";
  custom_fields_data: unknown;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  checkout_origin: string | null;
}

const ORDER_COLUMNS =
  "id, coach_id, service_id, user_id, provider, gateway_order_id, gateway_payment_id, " +
  "amount, currency, status, custom_fields_data, buyer_name, buyer_email, buyer_phone, " +
  "checkout_origin";

// ---------------------------------------------------------------- crypto ---

/** Constant-time compare so a signature can't be probed byte by byte. */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  // Length is folded into the result rather than short-circuited on, so a
  // wrong length is indistinguishable from wrong bytes.
  let diff = x.length ^ y.length;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ (y[i] ?? 0);
  return diff === 0;
}

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/** Razorpay signs with HMAC-SHA256; Instamojo's MAC is HMAC-SHA1. */
export async function hmacHex(
  secret: string,
  message: string,
  hash: "SHA-256" | "SHA-1" = "SHA-256",
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

// -------------------------------------------------------------- gateways ---

/** Price is always resolved from the service row, never from the request. */
export function resolvePrice(service: {
  price: number | null;
  discounted_price: number | null;
}): number {
  return Number(service.discounted_price ?? service.price ?? 0);
}

const GATEWAY_COLUMNS =
  "provider, key_id, key_secret, salt, webhook_secret, environment, currency, is_enabled, is_default";

export async function loadGateway(
  admin: Admin,
  coachId: string,
  requested: Provider | null,
): Promise<{ gateway: GatewayConfig | null; reason: string | null }> {
  const { data, error } = await admin
    .from("coach_payment_gateways")
    .select(GATEWAY_COLUMNS)
    .eq("coach_id", coachId)
    .eq("is_enabled", true);

  if (error) return { gateway: null, reason: "Could not read payment configuration" };

  const configured = (data || []).filter(
    (g: Record<string, unknown>) => g.key_id && g.key_secret,
  );
  if (configured.length === 0) {
    return { gateway: null, reason: "This coach has not connected a payment gateway yet" };
  }

  const chosen = requested
    ? configured.find((g: Record<string, unknown>) => g.provider === requested)
    : configured.find((g: Record<string, unknown>) => g.is_default) ?? configured[0];

  if (!chosen) {
    return { gateway: null, reason: `${requested} is not configured for this coach` };
  }

  return { gateway: chosen as unknown as GatewayConfig, reason: null };
}

/**
 * Loads a gateway by coach and provider regardless of the enabled flag.
 *
 * A webhook for a payment taken last week must still verify even if the coach
 * has since switched that gateway off, or the buyer's money is stranded.
 */
export async function loadGatewayForVerification(
  admin: Admin,
  coachId: string,
  provider: Provider,
): Promise<GatewayConfig | null> {
  const { data } = await admin
    .from("coach_payment_gateways")
    .select(GATEWAY_COLUMNS)
    .eq("coach_id", coachId)
    .eq("provider", provider)
    .maybeSingle();

  return (data as unknown as GatewayConfig) ?? null;
}

// -------------------------------------------------------- payment orders ---

export async function recordOrder(
  admin: Admin,
  order: {
    coachId: string;
    serviceId: string;
    /** Null when the buyer has no account yet; one is made once they pay. */
    userId: string | null;
    provider: Provider;
    gatewayOrderId: string;
    amount: number;
    currency: string;
    customFields: unknown;
    buyerName: string | null;
    buyerEmail: string | null;
    buyerPhone: string | null;
    checkoutOrigin: string | null;
  },
): Promise<void> {
  const { error } = await admin.from("payment_orders").upsert(
    {
      coach_id: order.coachId,
      service_id: order.serviceId,
      user_id: order.userId,
      provider: order.provider,
      gateway_order_id: order.gatewayOrderId,
      amount: order.amount,
      currency: order.currency,
      custom_fields_data: order.customFields ?? null,
      buyer_name: order.buyerName,
      buyer_email: order.buyerEmail?.trim().toLowerCase() ?? null,
      buyer_phone: order.buyerPhone,
      checkout_origin: order.checkoutOrigin,
      status: "created",
    },
    { onConflict: "provider,gateway_order_id" },
  );

  // A failure to record must not block the buyer from paying — verification
  // falls back to querying the gateway directly. It only costs the webhook its
  // fast path, so this is logged rather than raised.
  if (error) console.error("payment_orders insert failed:", error);
}

export async function findOrder(
  admin: Admin,
  provider: Provider,
  gatewayOrderId: string,
): Promise<PaymentOrder | null> {
  const { data } = await admin
    .from("payment_orders")
    .select(ORDER_COLUMNS)
    .eq("provider", provider)
    .eq("gateway_order_id", gatewayOrderId)
    .maybeSingle();

  return (data as unknown as PaymentOrder) ?? null;
}

/**
 * Finds the order a payment ended up attached to.
 *
 * A refund webhook names the payment, not the order, so this is how a reversal
 * gets back to the purchase it should undo.
 */
export async function findOrderByPayment(
  admin: Admin,
  provider: Provider,
  gatewayPaymentId: string,
): Promise<PaymentOrder | null> {
  const { data } = await admin
    .from("payment_orders")
    .select(ORDER_COLUMNS)
    .eq("provider", provider)
    .eq("gateway_payment_id", gatewayPaymentId)
    .maybeSingle();

  return (data as unknown as PaymentOrder) ?? null;
}

export async function markOrder(
  admin: Admin,
  orderId: string,
  patch: {
    status: PaymentOrder["status"];
    gatewayPaymentId?: string | null;
    failureReason?: string | null;
    userId?: string | null;
  },
): Promise<void> {
  const { error } = await admin
    .from("payment_orders")
    .update({
      status: patch.status,
      ...(patch.gatewayPaymentId ? { gateway_payment_id: patch.gatewayPaymentId } : {}),
      ...(patch.userId ? { user_id: patch.userId } : {}),
      ...(patch.failureReason !== undefined ? { failure_reason: patch.failureReason } : {}),
      ...(patch.status === "paid" ? { paid_at: new Date().toISOString() } : {}),
    })
    .eq("id", orderId);

  if (error) console.error("payment_orders update failed:", error);
}

/**
 * Has this gateway payment id already been spent on something else?
 *
 * Without this, one genuine payment can be presented against every service a
 * coach sells: the signature stays valid, and a per-(service, user) grant
 * check sees a different service each time and lets it through.
 */
export async function paymentAlreadySpent(
  admin: Admin,
  provider: Provider,
  paymentId: string,
  claim: { orderId: string | null; serviceId: string; userId: string },
): Promise<boolean> {
  const { data: orders } = await admin
    .from("payment_orders")
    .select("id, service_id, user_id")
    .eq("provider", provider)
    .eq("gateway_payment_id", paymentId)
    .limit(5);

  const clash = (orders || []).some(
    (r: { id: string; service_id: string; user_id: string }) =>
      r.id !== claim.orderId &&
      (r.service_id !== claim.serviceId || r.user_id !== claim.userId),
  );
  if (clash) return true;

  // The grant itself is the backstop, and it also covers purchases made before
  // payment_orders existed. A payment id already attached to a different
  // (service, buyer) pair is being reused.
  const { data: grants } = await admin
    .from("service_users")
    .select("service_id, user_id")
    .eq("transaction_id", paymentId)
    .limit(5);

  return (grants || []).some(
    (r: { service_id: string; user_id: string }) =>
      r.service_id !== claim.serviceId || r.user_id !== claim.userId,
  );
}

// ------------------------------------------------------------ fulfilment ---

/**
 * Grants access after a payment is confirmed.
 *
 * Insert-on-conflict rather than check-then-insert: the browser callback and
 * the webhook routinely land at the same moment, and a read followed by a
 * write lets both see "no row yet" and one of them then fails the whole grant
 * on a unique violation — after the money is already taken.
 */
export async function grantServiceAccess(
  admin: Admin,
  opts: {
    serviceId: string;
    userId: string;
    amount: number;
    provider: Provider | "free";
    transactionId: string | null;
    customFields: unknown;
  },
): Promise<{ ok: true; alreadyGranted: boolean } | { ok: false; error: string }> {
  const { data: inserted, error: suError } = await admin
    .from("service_users")
    .upsert(
      {
        service_id: opts.serviceId,
        user_id: opts.userId,
        status: "active",
        amount_paid: opts.amount,
        payment_method: opts.provider,
        transaction_id: opts.transactionId,
        custom_fields_data: opts.customFields ?? null,
      },
      { onConflict: "service_id,user_id", ignoreDuplicates: true },
    )
    .select("id");

  if (suError) {
    console.error("service_users upsert failed:", suError);
    return {
      ok: false,
      error: "Payment captured but access could not be granted. Contact support.",
    };
  }

  // Nothing came back means the conflict target already held a row: either a
  // repeat callback for a purchase already in place, or — because the unique
  // key is (service, buyer) and a refund leaves the row behind — a buyer
  // returning after a refund or an expiry. The second case is a real new sale
  // and has to reopen the row it collided with, or the buyer pays and stays
  // locked out.
  let alreadyGranted = (inserted || []).length === 0;

  if (alreadyGranted) {
    const { data: reopened, error: reopenError } = await admin
      .from("service_users")
      .update({
        status: "active",
        amount_paid: opts.amount,
        payment_method: opts.provider,
        transaction_id: opts.transactionId,
        ...(opts.customFields ? { custom_fields_data: opts.customFields } : {}),
      })
      .eq("service_id", opts.serviceId)
      .eq("user_id", opts.userId)
      .neq("status", "active")
      .select("id");

    if (reopenError) {
      console.error("service_users reactivation failed:", reopenError);
      return {
        ok: false,
        error: "Payment captured but access could not be restored. Contact support.",
      };
    }

    // Reopening one is a fresh grant: it should be billed and receipted.
    if ((reopened || []).length > 0) alreadyGranted = false;
  }

  const { data: linked } = await admin
    .from("service_courses")
    .select("course_id")
    .eq("service_id", opts.serviceId);

  if (linked && linked.length > 0) {
    const rows = linked.map((c: { course_id: string }) => ({
      course_id: c.course_id,
      user_id: opts.userId,
    }));
    // Same reasoning as above: let the unique index decide, so a concurrent
    // enrolment is a no-op instead of failing the grant.
    const { error } = await admin
      .from("enrollments")
      .upsert(rows, { onConflict: "user_id,course_id", ignoreDuplicates: true });
    if (error) console.error("enrollments upsert failed:", error);
  }

  return { ok: true, alreadyGranted };
}

/**
 * Books a completed payment into the sales ledger.
 *
 * The unique index on (gateway, gateway_txn_id) makes a repeated callback a
 * no-op rather than a duplicate sale.
 */
export async function recordSale(
  admin: Admin,
  opts: {
    coachId: string;
    userId: string;
    serviceId: string;
    itemName: string;
    amount: number;
    currency: string;
    provider: Provider;
    transactionId: string;
  },
): Promise<void> {
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", opts.userId)
    .maybeSingle();

  const { error } = await admin.from("transactions").insert({
    coach_id: opts.coachId,
    user_id: opts.userId,
    service_id: opts.serviceId,
    type: "sale",
    status: "completed",
    amount: opts.amount,
    currency: opts.currency,
    gateway: opts.provider,
    gateway_txn_id: opts.transactionId,
    customer_name: profile?.full_name ?? null,
    customer_email: profile?.email ?? null,
    item_name: opts.itemName,
  });

  // A duplicate is the expected outcome of a retried webhook, not a failure.
  if (error && !/duplicate key/i.test(error.message)) {
    console.error("transaction insert failed:", error);
  }
}

// ----------------------------------------------------------------- buyer ---

/**
 * A password someone can retype from an email without misreading it.
 *
 * No l/1/I or O/0, and the byte is rejected rather than folded when it falls
 * outside a whole number of alphabets, so every character stays equally likely.
 */
function temporaryPassword(length = 12): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const limit = 256 - (256 % alphabet.length);
  let out = "";
  while (out.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length))) {
      if (byte >= limit) continue;
      out += alphabet[byte % alphabet.length];
      if (out.length === length) break;
    }
  }
  return out;
}

/** Where to send someone to sign in, honouring a coach's own domain. */
function siteOrigin(order: PaymentOrder): string {
  const origin = order.checkout_origin || Deno.env.get("PUBLIC_SITE_URL") || "";
  return origin.replace(/\/+$/, "");
}

/**
 * Finds the account this purchase belongs to, creating one if the buyer paid
 * without signing up.
 *
 * The account is made here, on a confirmed payment, rather than by a public
 * endpoint the checkout could call: an endpoint that creates a user on request
 * is an open door for filling the auth table with junk.
 */
async function resolveBuyer(
  admin: Admin,
  order: PaymentOrder,
): Promise<
  | { ok: true; userId: string; temporaryPassword: string | null }
  | { ok: false; error: string }
> {
  if (order.user_id) {
    return { ok: true, userId: order.user_id, temporaryPassword: null };
  }

  const email = order.buyer_email?.trim().toLowerCase();
  if (!email) {
    return { ok: false, error: "This order has no buyer to grant access to" };
  }

  const findByEmail = async () => {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    return data?.id as string | undefined;
  };

  // Someone buying a second time, or buying while signed out of an account
  // they already have, must land on that same account.
  const existing = await findByEmail();
  if (existing) return { ok: true, userId: existing, temporaryPassword: null };

  const password = temporaryPassword();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    // They proved they own the address by paying from it; making them confirm
    // before they can reach what they just bought would be a strange welcome.
    email_confirm: true,
    user_metadata: {
      full_name: order.buyer_name || "",
      phone: order.buyer_phone || "",
    },
  });

  if (error || !created?.user) {
    // Either two callbacks raced to create the same buyer, or an auth user
    // exists whose profile row is missing. Looking again settles the first;
    // the second is a real failure worth surfacing.
    const raced = await findByEmail();
    if (raced) return { ok: true, userId: raced, temporaryPassword: null };

    console.error("buyer account creation failed:", error);
    return {
      ok: false,
      error: "Payment captured but your account could not be created. Contact support.",
    };
  }

  return { ok: true, userId: created.user.id, temporaryPassword: password };
}

// ------------------------------------------------------------ notifying ----

/**
 * Everyone on the selling side who should hear about a sale: the coach whose
 * service it is, plus the platform's admins and super admins.
 */
async function staffRecipients(admin: Admin, coachId: string): Promise<string[]> {
  const emails = new Set<string>();

  const { data: coach } = await admin
    .from("profiles")
    .select("email")
    .eq("id", coachId)
    .maybeSingle();
  if (coach?.email) emails.add(String(coach.email).toLowerCase());

  const { data: roles } = await admin
    .from("user_roles")
    .select("user_id")
    .in("role", ["admin", "super_admin"]);

  const ids = (roles || []).map((r: { user_id: string }) => r.user_id);
  if (ids.length > 0) {
    const { data: staff } = await admin
      .from("profiles")
      .select("email")
      .in("id", ids);
    for (const p of staff || []) {
      if (p.email) emails.add(String(p.email).toLowerCase());
    }
  }

  return [...emails];
}

/**
 * Everything that goes out once a payment is confirmed.
 *
 * Each send is independent and never throws (see sendTemplatedEmail), so one
 * bad address cannot cost the buyer the rest of their mail — or, worse, fail
 * the fulfilment that already granted them access.
 */
async function sendPurchaseEmails(
  admin: Admin,
  opts: {
    order: PaymentOrder;
    userId: string;
    temporaryPassword: string | null;
    serviceTitle: string;
    transactionId: string;
  },
): Promise<void> {
  const { order } = opts;

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", opts.userId)
    .maybeSingle();

  const buyerEmail = profile?.email || order.buyer_email || "";
  const buyerName = profile?.full_name || order.buyer_name || "there";
  const origin = siteOrigin(order);
  const amount = String(order.amount);
  const method = order.provider === "razorpay" ? "Razorpay" : "Instamojo";
  const paymentDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const { data: coach } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", order.coach_id)
    .maybeSingle();
  const coachName = coach?.full_name || "your coach";

  if (buyerEmail) {
    // Sign-in details first: without them a new buyer cannot act on anything
    // the other two emails tell them about.
    if (opts.temporaryPassword) {
      await sendTemplatedEmail({
        templateKey: "account_created",
        to: buyerEmail,
        coachId: order.coach_id,
        variables: {
          full_name: buyerName,
          email: buyerEmail,
          temporary_password: opts.temporaryPassword,
          login_link: `${origin}/login`,
          coach_name: coachName,
        },
      });
    }

    await sendTemplatedEmail({
      templateKey: "service_purchase_confirmed",
      to: buyerEmail,
      coachId: order.coach_id,
      variables: {
        full_name: buyerName,
        service_name: opts.serviceTitle,
        amount,
        coach_name: coachName,
        booking_link: `${origin}/dashboard`,
      },
    });

    await sendTemplatedEmail({
      templateKey: "payment_receipt",
      to: buyerEmail,
      coachId: order.coach_id,
      variables: {
        full_name: buyerName,
        item_name: opts.serviceTitle,
        // Raw: send-templated-email formats it in the workspace currency.
        amount,
        transaction_id: opts.transactionId,
        payment_method: method,
        payment_date: paymentDate,
      },
    });
  }

  for (const to of await staffRecipients(admin, order.coach_id)) {
    await sendTemplatedEmail({
      templateKey: "sale_notification",
      to,
      coachId: order.coach_id,
      variables: {
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        item_name: opts.serviceTitle,
        amount,
        payment_method: method,
        transaction_id: opts.transactionId,
        coach_name: coachName,
        dashboard_link: `${origin}/dashboard`,
      },
    });
  }
}

/**
 * The one path from "the gateway confirmed this money" to "the buyer has what
 * they bought". Called by the browser return trip and by the webhook, in
 * either order and possibly at once; whichever arrives first does the work and
 * the other becomes a no-op.
 */
export async function fulfillPayment(
  admin: Admin,
  opts: {
    order: PaymentOrder;
    paymentId: string;
    /** What the gateway says was actually captured, in major units. */
    paidAmount: number;
    serviceTitle: string;
    /** Only the browser has these; a webhook passes nothing and keeps what was stored. */
    customFields?: unknown;
  },
): Promise<
  | { ok: true; alreadyGranted: boolean; userId: string }
  | { ok: false; error: string; status: number }
> {
  const { order, paymentId } = opts;

  // Tolerate a rounding cent, but never a short payment.
  if (!Number.isFinite(opts.paidAmount) || opts.paidAmount + 0.01 < Number(order.amount)) {
    return {
      ok: false,
      status: 400,
      error: "The amount paid does not match the price of this service",
    };
  }

  // Who this purchase is for. For a guest order this is where the account
  // comes into existence, so it happens before anything is granted.
  const buyer = await resolveBuyer(admin, order);
  if (!buyer.ok) return { ok: false, status: 500, error: buyer.error };

  const spent = await paymentAlreadySpent(admin, order.provider, paymentId, {
    orderId: order.id,
    serviceId: order.service_id,
    userId: buyer.userId,
  });
  if (spent) {
    return {
      ok: false,
      status: 409,
      error: "This payment has already been used for another purchase",
    };
  }

  const granted = await grantServiceAccess(admin, {
    serviceId: order.service_id,
    userId: buyer.userId,
    amount: Number(order.amount),
    provider: order.provider,
    transactionId: paymentId,
    customFields: opts.customFields ?? order.custom_fields_data,
  });
  if (!granted.ok) return { ok: false, status: 500, error: granted.error };

  // Recording the account on the order is what stops a second callback from
  // treating this as a guest purchase and resolving the buyer all over again.
  await markOrder(admin, order.id, {
    status: "paid",
    gatewayPaymentId: paymentId,
    userId: buyer.userId,
  });

  // Mail and a ledger row belong to a fresh grant only; a repeat callback for
  // the same purchase must not produce a second of either.
  if (!granted.alreadyGranted) {
    await recordSale(admin, {
      coachId: order.coach_id,
      userId: buyer.userId,
      serviceId: order.service_id,
      itemName: opts.serviceTitle,
      amount: Number(order.amount),
      currency: order.currency,
      provider: order.provider,
      transactionId: paymentId,
    });

    await sendPurchaseEmails(admin, {
      order,
      userId: buyer.userId,
      temporaryPassword: buyer.temporaryPassword,
      serviceTitle: opts.serviceTitle,
      transactionId: paymentId,
    });
  }

  return { ok: true, alreadyGranted: granted.alreadyGranted, userId: buyer.userId };
}

/**
 * Withdraws access after the gateway reports a refund, and books the reversal.
 *
 * Access is marked refunded rather than deleted so the purchase history stays
 * intact and a coach can see what happened.
 */
export async function reverseForRefund(
  admin: Admin,
  opts: {
    order: PaymentOrder;
    refundId: string;
    amount: number;
    serviceTitle: string;
  },
): Promise<void> {
  const { error: suError } = await admin
    .from("service_users")
    .update({ status: "refunded" })
    .eq("service_id", opts.order.service_id)
    .eq("user_id", opts.order.user_id);

  if (suError) console.error("service_users refund update failed:", suError);

  const { data: linked } = await admin
    .from("service_courses")
    .select("course_id")
    .eq("service_id", opts.order.service_id);

  // Course access came with the purchase, so it goes back with the refund.
  if (linked && linked.length > 0) {
    const { error } = await admin
      .from("enrollments")
      .delete()
      .eq("user_id", opts.order.user_id)
      .in("course_id", linked.map((c: { course_id: string }) => c.course_id));
    if (error) console.error("enrollments refund delete failed:", error);
  }

  const { error: txError } = await admin.from("transactions").insert({
    coach_id: opts.order.coach_id,
    user_id: opts.order.user_id,
    service_id: opts.order.service_id,
    type: "refund",
    status: "refunded",
    amount: opts.amount,
    currency: opts.order.currency,
    gateway: opts.order.provider,
    gateway_txn_id: opts.refundId,
    item_name: opts.serviceTitle,
  });

  if (txError && !/duplicate key/i.test(txError.message)) {
    console.error("refund transaction insert failed:", txError);
  }

  await markOrder(admin, opts.order.id, { status: "refunded" });
}

export const instamojoBase = (env: "live" | "test") =>
  env === "test" ? "https://test.instamojo.com/api/1.1" : "https://www.instamojo.com/api/1.1";

export const razorpayAuth = (g: Pick<GatewayConfig, "key_id" | "key_secret">) =>
  "Basic " + btoa(`${g.key_id}:${g.key_secret}`);
