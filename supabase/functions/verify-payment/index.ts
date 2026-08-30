// Confirms a payment with the gateway, then grants access.
//
// Nothing here trusts the caller's account of what happened, and — just as
// importantly — nothing trusts the caller's account of *what was bought*.
// A valid signature only proves the payment is genuine; it says nothing about
// which service it was for. So the service, the buyer and the price all come
// from the recorded order or from the gateway's own copy of it, never from the
// request body. Otherwise one real ₹1 payment can be replayed against every
// other service the same coach sells.
//
//   Razorpay  — the HMAC signature is recomputed from the coach's secret, then
//               the order is re-read from Razorpay for its status and amount.
//   Instamojo — the payment is fetched *under* its payment request, so the two
//               cannot be mismatched, and its status and amount are checked.
//               Redirect parameters are never trusted; the buyer controls the
//               URL they come back on.

import {
  adminClient,
  corsHeaders,
  findOrder,
  fulfillPayment,
  hmacHex,
  instamojoBase,
  isProvider,
  json,
  loadGatewayForVerification,
  markOrder,
  optionalUser,
  razorpayAuth,
  resolvePrice,
  timingSafeEqual,
  type GatewayConfig,
  type PaymentOrder,
  type Provider,
} from "../_shared/payments.ts";

type Admin = ReturnType<typeof adminClient>;

interface ServiceRow {
  id: string;
  coach_id: string;
  title: string;
  price: number | null;
  discounted_price: number | null;
  currency: string | null;
}

const loadService = async (admin: Admin, id: string) => {
  const { data } = await admin
    .from("services")
    .select("id, coach_id, title, price, discounted_price, currency")
    .eq("id", id)
    .single();
  return (data as ServiceRow) ?? null;
};

/**
 * Builds the authoritative order for a payment that has no payment_orders row.
 *
 * Only reachable for payments started before that table existed, or if
 * recording one failed. The service and buyer are supplied by the caller here,
 * so the amount is required to match exactly and the global replay guard in
 * fulfillPayment is what stops this being a way to reuse a payment.
 */
const syntheticOrder = (
  service: ServiceRow,
  buyer: { userId: string | null; email: string | null },
  provider: Provider,
  gatewayOrderId: string,
  currency: string,
  customFields: unknown,
  origin: string | null,
): PaymentOrder => ({
  id: crypto.randomUUID(),
  coach_id: service.coach_id,
  service_id: service.id,
  user_id: buyer.userId,
  provider,
  gateway_order_id: gatewayOrderId,
  gateway_payment_id: null,
  amount: resolvePrice(service),
  currency,
  status: "created",
  custom_fields_data: customFields,
  buyer_name: null,
  buyer_email: buyer.email,
  buyer_phone: null,
  checkout_origin: origin,
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Checkout runs signed out, so a buyer confirming their own payment may
    // legitimately have no session. The order — not the caller — decides who
    // the purchase belongs to, so an absent session costs nothing.
    const userId = await optionalUser(req);

    const body = await req.json().catch(() => ({}));
    const provider = body.provider as Provider | undefined;
    const customFields = body.custom_fields_data ?? null;
    // Only used to build links in the buyer's mail when no recorded order
    // carries an origin of its own.
    const origin = typeof body.origin === "string" ? body.origin : null;

    if (!isProvider(provider)) {
      return json({ error: "A valid provider is required" }, 400);
    }

    const admin = adminClient();

    // ------------------------------------------------------- razorpay ------
    if (provider === "razorpay") {
      const orderId = body.razorpay_order_id as string | undefined;
      const paymentId = body.razorpay_payment_id as string | undefined;
      const signature = body.razorpay_signature as string | undefined;

      if (!orderId || !paymentId || !signature) {
        return json({ error: "Missing payment details" }, 400);
      }

      // The recorded order is the authority on what was bought. Fall back to
      // the request only to find which coach's secret to check against — the
      // signature check then fails unless that guess was right, and the real
      // service is re-derived from Razorpay's own notes below.
      let order = await findOrder(admin, "razorpay", orderId);
      const coachHint = order?.coach_id
        ?? (body.service_id ? (await loadService(admin, String(body.service_id)))?.coach_id : null);

      if (!coachHint) return json({ error: "Order not found" }, 404);

      const gateway = await loadGatewayForVerification(admin, coachHint, "razorpay");
      if (!gateway?.key_secret) {
        return json({ error: "Razorpay is not configured for this coach" }, 400);
      }

      const expected = await hmacHex(gateway.key_secret, `${orderId}|${paymentId}`);
      if (!timingSafeEqual(expected, signature)) {
        return json({ error: "Invalid payment signature" }, 400);
      }

      // Signature proves the pair is genuine. Re-read the order to learn what
      // it was actually for and whether the money truly landed.
      const res = await fetch(
        `https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`,
        { headers: { Authorization: razorpayAuth(gateway) } },
      );

      if (!res.ok) {
        console.error("Razorpay order lookup failed:", await res.text());
        return json({ error: "Payment could not be verified" }, 502);
      }

      const rzOrder = await res.json();

      if (rzOrder.status !== "paid") {
        return json(
          { error: `Payment is not complete (order status: ${rzOrder.status})` },
          400,
        );
      }

      if (!order) {
        // Razorpay's notes are ours: they were written server-side when the
        // order was created, so they are trustworthy here.
        const noteServiceId = rzOrder.notes?.service_id;
        const noteUserId = rzOrder.notes?.user_id;
        if (!noteServiceId) return json({ error: "Order not found" }, 404);

        const service = await loadService(admin, String(noteServiceId));
        if (!service) return json({ error: "Service not found" }, 404);

        order = syntheticOrder(
          service,
          {
            userId: noteUserId ? String(noteUserId) : userId,
            // Written into the notes when the order was created, so a guest
            // purchase still knows whose account to resolve or create.
            email: rzOrder.notes?.buyer_email ? String(rzOrder.notes.buyer_email) : null,
          },
          "razorpay",
          orderId,
          rzOrder.currency || service.currency || "INR",
          customFields,
          origin,
        );
      }

      // Fulfilment grants to the order's own buyer, never to the caller, so a
      // mismatch here cannot steal a purchase. Refusing it anyway keeps a
      // signed-in stranger from poking at someone else's order.
      if (userId && order.user_id && order.user_id !== userId) {
        return json({ error: "This payment belongs to a different account" }, 403);
      }

      const service = await loadService(admin, order.service_id);
      if (!service) return json({ error: "Service not found" }, 404);

      const result = await fulfillPayment(admin, {
        order,
        paymentId,
        paidAmount: Number(rzOrder.amount_paid ?? rzOrder.amount) / 100,
        serviceTitle: service.title,
        customFields,
      });

      if (!result.ok) return json({ error: result.error }, result.status);

      return json({
        success: true,
        already_granted: result.alreadyGranted,
        message: "Payment verified and access granted",
      });
    }

    // ------------------------------------------------------ instamojo ------
    const paymentRequestId = body.payment_request_id as string | undefined;
    const paymentId = body.payment_id as string | undefined;

    if (!paymentRequestId || !paymentId) {
      return json({ error: "Missing payment details" }, 400);
    }

    let order = await findOrder(admin, "instamojo", paymentRequestId);
    let service: ServiceRow | null = order ? await loadService(admin, order.service_id) : null;

    if (!order) {
      if (!body.service_id) return json({ error: "Order not found" }, 404);
      service = await loadService(admin, String(body.service_id));
      if (!service) return json({ error: "Service not found" }, 404);
      order = syntheticOrder(
        service,
        { userId, email: null },
        "instamojo",
        paymentRequestId,
        service.currency || "INR",
        customFields,
        origin,
      );
    }

    if (!service) return json({ error: "Service not found" }, 404);

    if (userId && order.user_id && order.user_id !== userId) {
      return json({ error: "This payment belongs to a different account" }, 403);
    }

    const gateway: GatewayConfig | null = await loadGatewayForVerification(
      admin,
      order.coach_id,
      "instamojo",
    );
    if (!gateway?.key_id || !gateway.key_secret) {
      return json({ error: "Instamojo is not configured for this coach" }, 400);
    }

    // Asking for the payment *under* its request is what binds the two: a
    // payment id from some other request simply is not found here, so a buyer
    // cannot present an unrelated successful payment of their own.
    const res = await fetch(
      `${instamojoBase(gateway.environment)}/payment-requests/${
        encodeURIComponent(paymentRequestId)
      }/${encodeURIComponent(paymentId)}/`,
      { headers: { "X-Api-Key": gateway.key_id, "X-Auth-Token": gateway.key_secret } },
    );

    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.success) {
      console.error("Instamojo lookup failed:", JSON.stringify(payload));
      return json({ error: "Payment could not be verified" }, 400);
    }

    const payment = payload.payment_request?.payment ?? payload.payment;
    if (!payment) {
      return json({ error: "Payment could not be verified" }, 400);
    }

    // "Credit" is Instamojo's terminal success state for a captured payment.
    if (payment.status !== "Credit") {
      await markOrder(admin, order.id, {
        status: "failed",
        gatewayPaymentId: paymentId,
        failureReason: String(payment.status ?? "unknown"),
      });
      return json({ error: `Payment is not complete (status: ${payment.status})` }, 400);
    }

    const result = await fulfillPayment(admin, {
      order,
      paymentId,
      paidAmount: Number(payment.amount),
      serviceTitle: service.title,
      customFields,
    });

    if (!result.ok) return json({ error: result.error }, result.status);

    return json({
      success: true,
      already_granted: result.alreadyGranted,
      message: "Payment verified and access granted",
    });
  } catch (err) {
    console.error("verify-payment error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
