import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// These assert the shape of the payment contract rather than rendering the
// page: the edge functions run on Deno and cannot be imported here, and every
// property worth protecting is about which side of the wire decides a fact.
const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const shared = read("supabase/functions/_shared/payments.ts");
const createOrder = read("supabase/functions/create-payment-order/index.ts");
const verifyPayment = read("supabase/functions/verify-payment/index.ts");
const webhook = read("supabase/functions/payment-webhook/index.ts");
const checkout = read("src/pages/ServiceCheckout.tsx");
const success = read("src/pages/ServiceCheckoutSuccess.tsx");

describe("order creation", () => {
  it("does not take the amount from the request body", () => {
    // Reading `amount` from the client let anyone open a ₹1 order against any
    // service, pay it, and receive a signature the verifier would honour.
    expect(createOrder).not.toMatch(
      /const\s*\{[^}]*\bamount\b[^}]*\}\s*=\s*await\s+req\.json\(\)/,
    );
    expect(createOrder).not.toMatch(/\bbody\.amount\b/);
  });

  it("resolves the price from the service record", () => {
    expect(createOrder).toMatch(/const amount = resolvePrice\(service\)/);
    expect(shared).toMatch(/discounted_price \?\? service\.price/);
  });

  it("refuses to sell a free, unpriced or inactive service", () => {
    expect(createOrder).toMatch(/is_free \|\| !Number\.isFinite\(amount\) \|\| amount <= 0/);
    expect(createOrder).toMatch(/service\.status !== "active"/);
  });

  it("charges in the currency the buyer was shown", () => {
    expect(createOrder).toMatch(/service\.currency \|\| gateway\.currency/);
    expect(createOrder).toMatch(/currency mismatch/);
  });

  it("records the order so a webhook can resolve what was bought", () => {
    // Two recordOrder calls: one per provider branch.
    expect(createOrder.match(/await recordOrder\(/g)?.length).toBe(2);
  });

  it("asks Instamojo to call the webhook", () => {
    expect(createOrder).toMatch(/webhook: webhookUrl\(\)/);
  });
});

describe("payment verification", () => {
  it("never takes the service being granted from the request body", () => {
    // A valid signature proves a payment is genuine, not what it was for. If
    // the caller names the service, one real ₹1 payment unlocks every service
    // the same coach sells.
    expect(verifyPayment).toMatch(/findOrder\(admin, "razorpay", orderId\)/);
    expect(verifyPayment).toMatch(/rzOrder\.notes\?\.service_id/);
    expect(verifyPayment).toMatch(/order\.service_id/);
  });

  it("confirms with the gateway that the money actually landed", () => {
    expect(verifyPayment).toMatch(/api\.razorpay\.com\/v1\/orders\//);
    expect(verifyPayment).toMatch(/rzOrder\.status !== "paid"/);
    expect(verifyPayment).toMatch(/payment\.status !== "Credit"/);
  });

  it("binds an Instamojo payment to its own payment request", () => {
    // Fetching the payment *under* the request is what stops a buyer
    // presenting an unrelated successful payment of their own.
    expect(verifyPayment).toMatch(
      /payment-requests\/\$\{\s*encodeURIComponent\(paymentRequestId\)\s*\}\/\$\{encodeURIComponent\(paymentId\)\}/,
    );
  });

  it("refuses a payment that belongs to someone else", () => {
    expect(verifyPayment.match(/order\.user_id !== userId/g)?.length).toBe(2);
  });

  it("compares signatures without short-circuiting", () => {
    expect(verifyPayment).toMatch(/timingSafeEqual\(expected, signature\)/);
    expect(shared).toMatch(/diff = x\.length \^ y\.length/);
  });
});

describe("fulfilment", () => {
  it("checks the captured amount against the recorded price", () => {
    expect(shared).toMatch(/opts\.paidAmount \+ 0\.01 < Number\(order\.amount\)/);
  });

  it("refuses a payment already spent on another purchase", () => {
    expect(shared).toMatch(/paymentAlreadySpent/);
    // The guard has to look past payment_orders, or purchases made before that
    // table existed would not block a reuse.
    expect(shared).toMatch(/from\("service_users"\)[\s\S]{0,160}eq\("transaction_id", paymentId\)/);
  });

  it("grants access without a check-then-insert race", () => {
    // The browser callback and the webhook routinely land together; a read
    // followed by a write lets both see "no row yet".
    expect(shared).toMatch(/ignoreDuplicates: true/);
    expect(shared).not.toMatch(/if \(existing\) return \{ ok: true, alreadyGranted: true \}/);
  });

  it("reopens a refunded purchase instead of silently doing nothing", () => {
    // The unique key is (service, buyer) and a refund leaves the row behind,
    // so a buyer coming back would collide with their own refunded row and be
    // told they already have access they no longer have.
    expect(shared).toMatch(/\.neq\("status", "active"\)/);
    expect(shared).toMatch(/\(reopened \|\| \[\]\)\.length > 0\) alreadyGranted = false/);
  });

  it("bills and emails only on a fresh grant", () => {
    expect(shared).toMatch(
      /if \(!granted\.alreadyGranted\) \{[\s\S]*?recordSale[\s\S]*?sendPurchaseEmails/,
    );
  });
});

describe("webhooks", () => {
  it("verifies the gateway's own signature rather than a Supabase JWT", () => {
    expect(webhook).toMatch(/x-razorpay-signature/);
    expect(webhook).toMatch(/hmacHex\(gateway\.webhook_secret, raw\)/);
    expect(webhook).toMatch(/hmacHex\(gateway\.salt, message, "SHA-1"\)/);
  });

  it("signs Razorpay over the raw bytes, not a re-serialized body", () => {
    expect(webhook).toMatch(/await req\.text\(\)/);
    expect(webhook).not.toMatch(/JSON\.stringify\([\s\S]{0,40}\)\s*,\s*signature/);
  });

  it("rejects an unsigned or wrongly signed event", () => {
    expect(webhook.match(/Invalid signature/g)?.length).toBe(2);
  });

  it("fulfils through the same path as the browser", () => {
    expect(webhook).toMatch(/fulfillPayment\(/);
  });

  it("asks for a retry only when retrying could help", () => {
    expect(webhook).toMatch(/result\.status >= 500 \? retry\(result\.error\) : ack\(result\.error\)/);
  });

  it("withdraws access on a refund", () => {
    expect(webhook).toMatch(/refund\.processed/);
    expect(webhook).toMatch(/reverseForRefund/);
  });
});

describe("guest checkout", () => {
  it("lets someone pay before they have an account", () => {
    // A public checkout link that demands a signup first asks the buyer to
    // invent an account on a page they have no reason to trust yet.
    expect(createOrder).toMatch(/optionalUser\(req\)/);
    expect(createOrder).not.toMatch(/requireUser/);
    expect(verifyPayment).toMatch(/optionalUser\(req\)/);
  });

  it("insists on the contact details the buyer will be reached on", () => {
    expect(createOrder).toMatch(/Your full name is required/);
    expect(createOrder).toMatch(/An email address is required/);
    expect(createOrder).toMatch(/A valid phone number is required/);
    // Enforced on the client too, so the buyer is told before they pay.
    expect(checkout).toMatch(/key: "name", message: "Enter your full name"/);
    expect(checkout).toMatch(/key: "phone", message: "Enter a valid phone number"/);
  });

  it("creates the account only once a payment is confirmed", () => {
    // An endpoint that makes a user on request is an open door for filling
    // the auth table with junk.
    expect(shared).toMatch(/auth\.admin\.createUser/);
    expect(shared).toMatch(/resolveBuyer\(admin, order\)/);
    expect(checkout).not.toMatch(/create-customer-user/);
  });

  it("attaches a repeat buyer to the account they already have", () => {
    expect(shared).toMatch(/const existing = await findByEmail\(\)/);
  });

  it("records the account on the order so a second callback does not re-resolve", () => {
    expect(shared).toMatch(/userId: buyer\.userId,\n  \}\);/);
  });

  it("builds links from where the buyer actually checked out", () => {
    // A coach on a white-label domain must not be mailed a link to the
    // platform's own hostname.
    expect(shared).toMatch(/order\.checkout_origin \|\| Deno\.env\.get\("PUBLIC_SITE_URL"\)/);
    expect(checkout).toMatch(/origin: window\.location\.origin/);
  });
});

describe("purchase emails", () => {
  it("tells the buyer, the coach and the platform admins", () => {
    expect(shared).toMatch(/templateKey: "account_created"/);
    expect(shared).toMatch(/templateKey: "service_purchase_confirmed"/);
    expect(shared).toMatch(/templateKey: "payment_receipt"/);
    expect(shared).toMatch(/templateKey: "sale_notification"/);
    expect(shared).toMatch(/\.in\("role", \["admin", "super_admin"\]\)/);
  });

  it("sends a temporary password only to an account it just made", () => {
    expect(shared).toMatch(/if \(opts\.temporaryPassword\) \{/);
  });

  it("draws the temporary password from unbiased randomness", () => {
    // Folding a byte into the alphabet with a bare modulo makes the first
    // characters of it likelier than the rest.
    expect(shared).toMatch(/const limit = 256 - \(256 % alphabet\.length\)/);
    expect(shared).toMatch(/if \(byte >= limit\) continue/);
  });
});

describe("gateway settings", () => {
  const card = read("src/components/payments/PaymentGatewaysCard.tsx");

  it("saves credentials without an upsert", () => {
    // key_secret, salt and webhook_secret are write-only: authenticated has no
    // SELECT on them. An upsert becomes ON CONFLICT DO UPDATE SET x =
    // excluded.x, and Postgres demands SELECT on anything read that way, so
    // saving any secret failed with "permission denied for table
    // coach_payment_gateways". A plain insert or update reads nothing.
    expect(card).not.toMatch(/\.upsert\(/);
    expect(card).toMatch(/\.update\(payload/);
    expect(card).toMatch(/\.insert\(payload\)/);
  });

  it("falls back to an update when the row already exists", () => {
    expect(card).toMatch(/error\?\.code === "23505"/);
  });

  it("never reads a secret back from the database", () => {
    expect(card).not.toMatch(/row\?\.key_secret|row\?\.salt|row\?\.webhook_secret/);
  });
});

describe("checkout client", () => {
  it("reads payment options from the public view, not the gateways table", () => {
    // The gateways table's only public policy is TO anon, so a buyer who signs
    // in to pay stops matching it and checkout reports that the coach has no
    // gateway connected — failing precisely when someone tries to buy.
    expect(checkout).toMatch(/from\("coach_payment_methods"\)/);
    expect(checkout).not.toMatch(/from\("coach_payment_gateways"\)/);
  });

  it("no longer sends an amount the server would have trusted", () => {
    expect(checkout).not.toMatch(
      /body:\s*JSON\.stringify\(\{\s*service_id:\s*service\.id,\s*amount:/,
    );
    expect(checkout).not.toMatch(/amount:\s*effectiveAmt,/);
  });

  it("enforces the fields the coach marked required", () => {
    expect(checkout).toMatch(/validateFields\(\)/);
    expect(checkout).toMatch(/customFieldKey\(f\.label\)/);
  });

  it("marks the offending field rather than only saying one exists", () => {
    // A toast can say something is missing; only the field itself says which.
    expect(checkout).toMatch(/<FieldError/);
    expect(checkout).toMatch(/aria-invalid=\{!!fieldErrors\.name\}/);
    expect(checkout).toMatch(/INVALID_FIELD/);
  });

  it("reports every problem at once, not one per attempt", () => {
    // Fixing a form one round trip per field is three reloads of the same
    // information the buyer could have corrected in one pass.
    expect(checkout).toMatch(/problems\.push/);
    expect(checkout).toMatch(/\$\{problems\.length\} fields need your attention/);
  });

  it("takes the buyer to the first bad field and sounds a chime", () => {
    expect(checkout).toMatch(/scrollIntoView/);
    expect(checkout).toMatch(/focus\?\.\(\{ preventScroll: true \}\)/);
    expect(checkout).toMatch(/playAttentionChime\(\)/);
  });

  it("shakes every offending row, not just the focused one", () => {
    // The toast gives a count; the shake has to make that count findable.
    expect(checkout).toMatch(
      /for \(const problem of problems\) shakeElement\(fieldRowRefs\.current\[problem\.key\]\)/,
    );
    // The row, so the phone field's "+91" moves with its input.
    expect(checkout).toMatch(/fieldRowRefs\.current\.phone = el/);
    expect(checkout).toMatch(/fieldRowRefs\.current\[key\] = el/);
  });

  it("clears a field's error as soon as it is being fixed", () => {
    expect(checkout).toMatch(/clearFieldError\("name"\)/);
    expect(checkout).toMatch(/clearFieldError\("email"\)/);
    expect(checkout).toMatch(/clearFieldError\("phone"\)/);
    expect(checkout).toMatch(/clearFieldError\(key\)/);
  });

  it("tells the buyer when a payment is declined", () => {
    expect(checkout).toMatch(/rzp\.on\("payment\.failed"/);
  });

  it("waits for the webhook before reporting a failure", () => {
    // The money is already gone by this point. Saying it failed, seconds
    // before the webhook lands, is what makes people pay twice.
    expect(checkout).toMatch(/waitForServiceAccess\(service\.id, user\.id\)/);
    expect(success).toMatch(/waitForServiceAccess\(serviceId, userId\)/);
  });
});
