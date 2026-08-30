/**
 * Single source of truth for the payment gateways a coach can connect.
 *
 * Adding a provider means adding an entry here plus a branch in the
 * create-payment-order / verify-payment edge functions — no schema change,
 * because credentials live in the generic key_id / key_secret / salt columns.
 */

export type PaymentProvider = "razorpay" | "instamojo";

export interface ProviderField {
  /** Column on coach_payment_gateways this field writes to. */
  column: "key_id" | "key_secret" | "salt" | "webhook_secret";
  label: string;
  placeholder: string;
  /** Secret fields are masked and never read back from the database. */
  secret: boolean;
  required: boolean;
  help?: string;
}

export interface ProviderSpec {
  id: PaymentProvider;
  name: string;
  /** How the buyer completes payment — changes the checkout flow. */
  flow: "modal" | "redirect";
  blurb: string;
  docsUrl: string;
  fields: ProviderField[];
  /** Currencies the gateway can charge in. */
  currencies: string[];
  supportsTestMode: boolean;
  /**
   * Events the coach must enable when registering the webhook by hand, or
   * null when the provider is told the URL programmatically and there is
   * nothing to register.
   */
  webhookEvents: string[] | null;
}

export const PAYMENT_PROVIDERS: Record<PaymentProvider, ProviderSpec> = {
  razorpay: {
    id: "razorpay",
    name: "Razorpay",
    flow: "modal",
    blurb: "Cards, UPI, netbanking and wallets. Buyers pay without leaving your checkout.",
    docsUrl: "https://dashboard.razorpay.com/app/keys",
    currencies: ["INR", "USD"],
    supportsTestMode: true,
    webhookEvents: [
      "payment.captured",
      "order.paid",
      "payment.failed",
      "refund.processed",
    ],
    fields: [
      {
        column: "key_id",
        label: "Key ID",
        placeholder: "rzp_live_xxxxxxxxxxxx",
        secret: false,
        required: true,
      },
      {
        column: "key_secret",
        label: "Key Secret",
        placeholder: "Enter your key secret",
        secret: true,
        required: true,
        help: "Stored write-only — it is never sent back to the browser.",
      },
      {
        column: "webhook_secret",
        label: "Webhook Secret",
        placeholder: "From Razorpay → Settings → Webhooks",
        secret: true,
        required: false,
        help:
          "Set this, and add the webhook URL below in Razorpay. Without it a buyer " +
          "who closes the tab after paying will not get access automatically.",
      },
    ],
  },

  instamojo: {
    id: "instamojo",
    name: "Instamojo",
    flow: "redirect",
    blurb: "Buyers are redirected to Instamojo to pay, then returned to your success page.",
    docsUrl: "https://www.instamojo.com/integrations/",
    currencies: ["INR"],
    supportsTestMode: true,
    // The URL is sent with every payment request, so there is nothing to
    // register — only the salt to copy across.
    webhookEvents: null,
    fields: [
      {
        column: "key_id",
        label: "API Key",
        placeholder: "test_xxxxxxxxxxxxxxxxxxxx",
        secret: false,
        required: true,
      },
      {
        column: "key_secret",
        label: "Auth Token",
        placeholder: "Enter your auth token",
        secret: true,
        required: true,
        help: "Stored write-only — it is never sent back to the browser.",
      },
      {
        column: "salt",
        label: "Private Salt",
        placeholder: "From Instamojo → Settings → Advanced",
        secret: true,
        required: false,
        help:
          "Instamojo signs webhooks with this. Without it a buyer who closes the " +
          "tab after paying will not get access automatically.",
      },
    ],
  },
};

export const PROVIDER_IDS = Object.keys(PAYMENT_PROVIDERS) as PaymentProvider[];

export const isPaymentProvider = (v: unknown): v is PaymentProvider =>
  typeof v === "string" && v in PAYMENT_PROVIDERS;

/** A saved gateway row, as the browser is allowed to see it (no secrets). */
export interface GatewayRow {
  id?: string;
  coach_id?: string;
  provider: PaymentProvider;
  key_id: string | null;
  environment: "live" | "test";
  currency: string;
  is_enabled: boolean;
  is_default: boolean;
  /** Presence flags — the secrets themselves are never readable. */
  has_secret: boolean;
  has_salt?: boolean;
  has_webhook_secret?: boolean;
}

/** Whether a saved gateway can verify the webhooks its provider sends. */
export function hasWebhookSigning(
  row: Pick<GatewayRow, "provider" | "has_salt" | "has_webhook_secret">,
): boolean {
  return row.provider === "instamojo" ? !!row.has_salt : !!row.has_webhook_secret;
}

/** A gateway is usable at checkout only once its required fields are filled. */
export function isGatewayReady(row: Pick<GatewayRow, "provider" | "key_id" | "has_secret">): boolean {
  const spec = PAYMENT_PROVIDERS[row.provider];
  if (!spec) return false;
  return spec.fields.every((f) => {
    if (!f.required) return true;
    if (f.column === "key_secret") return row.has_secret;
    if (f.column === "key_id") return !!row.key_id?.trim();
    return true;
  });
}

/**
 * Which gateway the checkout should preselect: the coach's default if it is
 * usable, otherwise the first usable one.
 */
export function pickDefaultGateway<T extends Pick<GatewayRow, "provider" | "key_id" | "has_secret" | "is_enabled" | "is_default">>(
  rows: T[],
): T | null {
  const usable = rows.filter((r) => r.is_enabled && isGatewayReady(r));
  return usable.find((r) => r.is_default) ?? usable[0] ?? null;
}
