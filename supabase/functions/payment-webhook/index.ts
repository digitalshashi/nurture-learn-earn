// Server-to-server payment notifications from Razorpay and Instamojo.
//
// Why this exists: access used to be granted only by the buyer's browser, on
// its way back from the gateway. Anything that stops that trip — a closed tab,
// a dead battery, a dropped connection, a bank page that never redirects —
// left the money captured and the buyer with nothing, and left no record that
// it had happened. A webhook is the gateway telling us directly, and it keeps
// arriving until we acknowledge it.
//
// Both providers post to this one URL. Neither sends a Supabase JWT, so this
// function runs with verify_jwt = false and authenticates the *request itself*
// by signature instead.
//
// Resolving the coach is a chicken-and-egg problem in a multi-tenant setup:
// the signature can only be checked once we know whose secret to use, and the
// only pointer to that is inside the unverified body. So the body is parsed to
// look up a candidate order, and the signature check against that coach's
// secret is what actually authorizes anything. A forged body can therefore
// name any order it likes and still gets nowhere.

import {
  adminClient,
  corsHeaders,
  findOrder,
  findOrderByPayment,
  fulfillPayment,
  hmacHex,
  json,
  loadGatewayForVerification,
  markOrder,
  reverseForRefund,
  timingSafeEqual,
  type PaymentOrder,
} from "../_shared/payments.ts";

type Admin = ReturnType<typeof adminClient>;

/** Acknowledged: the gateway should stop retrying. */
const ack = (message: string, extra: Record<string, unknown> = {}) =>
  json({ received: true, message, ...extra }, 200);

/** Not acknowledged: the gateway should retry this one later. */
const retry = (message: string) => json({ received: false, message }, 500);

const serviceTitle = async (admin: Admin, serviceId: string): Promise<string> => {
  const { data } = await admin
    .from("services")
    .select("title")
    .eq("id", serviceId)
    .maybeSingle();
  return data?.title ?? "Purchase";
};

// ============================================================== razorpay ===

/**
 * Razorpay signs the exact bytes of the request body with the webhook secret
 * set in its dashboard — a different value from the API key secret.
 */
async function handleRazorpay(
  admin: Admin,
  raw: string,
  signature: string,
): Promise<Response> {
  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: Record<string, unknown> };
      order?: { entity?: Record<string, unknown> };
      refund?: { entity?: Record<string, unknown> };
    };
  };

  try {
    event = JSON.parse(raw);
  } catch {
    return json({ error: "Malformed payload" }, 400);
  }

  const name = event.event ?? "";
  const payment = event.payload?.payment?.entity;
  const refund = event.payload?.refund?.entity;
  const orderEntity = event.payload?.order?.entity;

  const orderId = String(
    payment?.order_id ?? orderEntity?.id ?? refund?.order_id ?? "",
  );
  const paymentId = String(payment?.id ?? refund?.payment_id ?? "");

  // Locate the order first — it is the only thing that says which coach, and
  // therefore which secret this signature must be checked against.
  let order: PaymentOrder | null = orderId
    ? await findOrder(admin, "razorpay", orderId)
    : null;
  if (!order && paymentId) {
    order = await findOrderByPayment(admin, "razorpay", paymentId);
  }

  if (!order) {
    // Nothing we know about. Acknowledged so Razorpay stops retrying: a test
    // event from the dashboard, or a payment taken outside this app, will
    // never resolve no matter how often it is sent.
    return ack("No matching order for this event");
  }

  const gateway = await loadGatewayForVerification(admin, order.coach_id, "razorpay");
  if (!gateway?.webhook_secret) {
    console.error(
      `razorpay webhook for coach ${order.coach_id} but no webhook secret is saved`,
    );
    return ack("Webhook secret is not configured for this coach");
  }

  const expected = await hmacHex(gateway.webhook_secret, raw);
  if (!timingSafeEqual(expected, signature)) {
    console.error("razorpay webhook signature mismatch for order", order.id);
    return json({ error: "Invalid signature" }, 401);
  }

  // ------------------------------------------------------ authorized ------

  if (name === "payment.failed") {
    await markOrder(admin, order.id, {
      status: "failed",
      gatewayPaymentId: paymentId || null,
      failureReason: String(payment?.error_description ?? payment?.error_reason ?? "failed"),
    });
    return ack("Recorded failed payment");
  }

  if (name === "refund.processed" || name === "refund.created") {
    if (order.status === "refunded") return ack("Already refunded");
    await reverseForRefund(admin, {
      order,
      refundId: String(refund?.id ?? paymentId),
      amount: Number(refund?.amount ?? 0) / 100,
      serviceTitle: await serviceTitle(admin, order.service_id),
    });
    return ack("Refund processed");
  }

  if (name === "payment.captured" || name === "order.paid") {
    if (!paymentId) return ack("Event carries no payment id");

    const captured = Number(
      payment?.amount ?? orderEntity?.amount_paid ?? orderEntity?.amount ?? 0,
    ) / 100;

    const result = await fulfillPayment(admin, {
      order,
      paymentId,
      paidAmount: captured,
      serviceTitle: await serviceTitle(admin, order.service_id),
    });

    if (!result.ok) {
      console.error("razorpay webhook fulfilment failed:", result.error);
      // A short payment or a reused id will never succeed on retry; a failed
      // write might. Only the latter is worth asking Razorpay to send again.
      return result.status >= 500 ? retry(result.error) : ack(result.error);
    }

    return ack(
      result.alreadyGranted ? "Already fulfilled" : "Access granted",
      { already_granted: result.alreadyGranted },
    );
  }

  return ack(`Ignored event ${name}`);
}

// ============================================================= instamojo ===

/**
 * Instamojo's MAC is HMAC-SHA1 over every posted field except `mac` itself:
 * values sorted by field name and joined with a pipe, keyed by the private
 * salt from the Instamojo dashboard.
 */
async function handleInstamojo(admin: Admin, form: URLSearchParams): Promise<Response> {
  const mac = form.get("mac") ?? "";
  const paymentRequestId = form.get("payment_request_id") ?? "";
  const paymentId = form.get("payment_id") ?? "";
  const status = form.get("status") ?? "";

  if (!paymentRequestId) return ack("No payment_request_id on this event");

  const order = await findOrder(admin, "instamojo", paymentRequestId);
  if (!order) return ack("No matching order for this event");

  const gateway = await loadGatewayForVerification(admin, order.coach_id, "instamojo");
  if (!gateway?.salt) {
    console.error(
      `instamojo webhook for coach ${order.coach_id} but no private salt is saved`,
    );
    return ack("Private salt is not configured for this coach");
  }

  const message = [...form.keys()]
    .filter((k) => k !== "mac")
    .sort()
    .map((k) => form.get(k) ?? "")
    .join("|");

  const expected = await hmacHex(gateway.salt, message, "SHA-1");
  if (!timingSafeEqual(expected, mac)) {
    console.error("instamojo webhook MAC mismatch for order", order.id);
    return json({ error: "Invalid signature" }, 401);
  }

  // ------------------------------------------------------ authorized ------

  if (status !== "Credit") {
    await markOrder(admin, order.id, {
      status: "failed",
      gatewayPaymentId: paymentId || null,
      failureReason: status || "unknown",
    });
    return ack(`Recorded non-credit status ${status}`);
  }

  if (!paymentId) return ack("Event carries no payment id");

  const result = await fulfillPayment(admin, {
    order,
    paymentId,
    paidAmount: Number(form.get("amount")),
    serviceTitle: await serviceTitle(admin, order.service_id),
  });

  if (!result.ok) {
    console.error("instamojo webhook fulfilment failed:", result.error);
    return result.status >= 500 ? retry(result.error) : ack(result.error);
  }

  return ack(
    result.alreadyGranted ? "Already fulfilled" : "Access granted",
    { already_granted: result.alreadyGranted },
  );
}

// ================================================================ router ===

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const admin = adminClient();
    const razorpaySignature = req.headers.get("x-razorpay-signature");

    if (razorpaySignature) {
      // Read the body as text, never as parsed JSON: the signature covers the
      // exact bytes, and re-serializing would not reproduce them.
      return await handleRazorpay(admin, await req.text(), razorpaySignature);
    }

    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      return await handleInstamojo(admin, new URLSearchParams(await req.text()));
    }

    // Instamojo can be configured to send JSON; accept that shape too.
    if (contentType.includes("application/json")) {
      const parsed = await req.json().catch(() => null);
      if (parsed && typeof parsed === "object" && "payment_request_id" in parsed) {
        const form = new URLSearchParams();
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
          form.set(k, v == null ? "" : String(v));
        }
        return await handleInstamojo(admin, form);
      }
    }

    console.error("payment-webhook: unrecognised request", contentType);
    return json({ error: "Unrecognised webhook" }, 400);
  } catch (err) {
    console.error("payment-webhook error:", err);
    // Ask for a retry: an unexpected throw is far more likely to be transient
    // than a permanently bad event, and dropping it would strand a payment.
    return retry("Internal error");
  }
});
