// Creates a payment order with whichever gateway the coach has connected.
//
// The amount is resolved from the service row and never taken from the request
// body. Every order is recorded in payment_orders before the buyer is sent to
// pay, so the webhook that reports the outcome can tell what was being bought
// even if the buyer never comes back.

import {
  adminClient,
  corsHeaders,
  instamojoBase,
  isProvider,
  json,
  loadGateway,
  optionalUser,
  razorpayAuth,
  recordOrder,
  resolvePrice,
  type Provider,
} from "../_shared/payments.ts";

/** Anything the buyer must supply before they are allowed to pay. */
interface Buyer {
  name: string;
  email: string;
  phone: string;
}

const EMAIL = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

/**
 * Validates the contact details, which are the only handle on a buyer who has
 * no account. A typo in the address means the account and everything they
 * bought lands somewhere they cannot reach, so this is checked here rather
 * than trusted from the form.
 */
function readBuyer(input: unknown): { buyer: Buyer } | { error: string } {
  const raw = (input ?? {}) as Record<string, unknown>;
  const name = String(raw.name ?? "").trim();
  const email = String(raw.email ?? "").trim().toLowerCase();
  const phone = String(raw.phone ?? "").trim();

  if (!name) return { error: "Your full name is required" };
  if (!email) return { error: "An email address is required" };
  if (!EMAIL.test(email)) return { error: "That email address does not look right" };
  if (phone.replace(/\D/g, "").length < 6) return { error: "A valid phone number is required" };

  return { buyer: { name, email, phone } };
}

const webhookUrl = () =>
  `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Signing in is not a precondition for paying. Someone following a public
    // link is identified by the details they type, and the account is created
    // for them once the money actually arrives.
    const userId = await optionalUser(req);

    const body = await req.json().catch(() => ({}));
    const serviceId = body.service_id as string | undefined;
    const requested = (body.provider ?? null) as Provider | null;
    const redirectUrl = body.redirect_url as string | undefined;
    const customFields = body.custom_fields_data ?? null;
    const checkoutOrigin = typeof body.origin === "string" ? body.origin : null;

    if (!serviceId) return json({ error: "service_id is required" }, 400);

    const read = readBuyer(body.buyer);
    if ("error" in read) return json({ error: read.error }, 400);
    const buyer = read.buyer;
    if (requested !== null && !isProvider(requested)) {
      return json({ error: "Unsupported payment provider" }, 400);
    }

    const admin = adminClient();

    const { data: service } = await admin
      .from("services")
      .select("id, coach_id, title, price, discounted_price, currency, is_free, status")
      .eq("id", serviceId)
      .single();

    if (!service) return json({ error: "Service not found" }, 404);

    // A paused or draft service must not be sellable through a link someone
    // still has open.
    if (service.status !== "active") {
      return json({ error: "This service is not currently available" }, 400);
    }

    const amount = resolvePrice(service);
    if (service.is_free || !Number.isFinite(amount) || amount <= 0) {
      return json({ error: "This service is free — no payment is required" }, 400);
    }

    const { gateway, reason } = await loadGateway(admin, service.coach_id, requested);
    if (!gateway) return json({ error: reason }, 400);

    // The buyer is shown the service's currency, so charging the gateway's
    // would take a different amount of money than the page advertised.
    const currency = service.currency || gateway.currency || "INR";
    if (gateway.currency && gateway.currency !== currency) {
      console.error(
        `currency mismatch: service ${serviceId} is ${currency}, ${gateway.provider} is set to ${gateway.currency}`,
      );
      return json(
        {
          error: `This service is priced in ${currency} but the payment gateway is set up for ${gateway.currency}. The coach needs to fix this before it can be sold.`,
        },
        400,
      );
    }

    // --------------------------------------------------------- razorpay ----
    if (gateway.provider === "razorpay") {
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: razorpayAuth(gateway),
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
          currency,
          receipt: `svc_${serviceId}`.slice(0, 40),
          // Read back during verification to prove the payment belongs to this
          // service and this buyer.
          notes: {
            service_id: serviceId,
            user_id: userId ?? "",
            buyer_email: buyer.email,
            service_title: service.title,
          },
        }),
      });

      if (!res.ok) {
        console.error("Razorpay order failed:", await res.text());
        return json({ error: "Failed to create payment order" }, 502);
      }

      const order = await res.json();

      await recordOrder(admin, {
        coachId: service.coach_id,
        serviceId,
        userId,
        provider: "razorpay",
        gatewayOrderId: order.id,
        amount,
        currency,
        customFields,
        buyerName: buyer.name,
        buyerEmail: buyer.email,
        buyerPhone: buyer.phone,
        checkoutOrigin,
      });

      return json({
        provider: "razorpay",
        flow: "modal",
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: gateway.key_id,
      });
    }

    // -------------------------------------------------------- instamojo ----
    // Instamojo takes form-encoded input and hands back a hosted page URL; the
    // buyer leaves the site and returns to redirect_url when they are done.
    const form = new URLSearchParams({
      purpose: service.title.slice(0, 30),
      amount: amount.toFixed(2),
      buyer_name: buyer.name,
      email: buyer.email,
      send_email: "false",
      send_sms: "false",
      allow_repeated_payments: "false",
      // Server-to-server notification, so a buyer who closes the tab after
      // paying still gets what they bought.
      webhook: webhookUrl(),
    });
    if (buyer.phone) form.set("phone", buyer.phone);
    if (redirectUrl) form.set("redirect_url", redirectUrl);

    const res = await fetch(`${instamojoBase(gateway.environment)}/payment-requests/`, {
      method: "POST",
      headers: {
        "X-Api-Key": gateway.key_id,
        "X-Auth-Token": gateway.key_secret,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.success) {
      console.error("Instamojo request failed:", JSON.stringify(payload));
      return json({ error: "Failed to create payment request" }, 502);
    }

    await recordOrder(admin, {
      coachId: service.coach_id,
      serviceId,
      userId,
      provider: "instamojo",
      gatewayOrderId: payload.payment_request.id,
      amount,
      currency,
      customFields,
      buyerName: buyer.name,
      buyerEmail: buyer.email,
      buyerPhone: buyer.phone,
      checkoutOrigin,
    });

    return json({
      provider: "instamojo",
      flow: "redirect",
      payment_request_id: payload.payment_request.id,
      redirect_to: payload.payment_request.longurl,
      amount,
      currency,
    });
  } catch (err) {
    console.error("create-payment-order error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
