import { describe, it, expect } from "vitest";
import {
  PAYMENT_PROVIDERS,
  PROVIDER_IDS,
  isGatewayReady,
  isPaymentProvider,
  pickDefaultGateway,
  type GatewayRow,
} from "./paymentProviders";

const row = (over: Partial<GatewayRow> = {}): GatewayRow => ({
  provider: "razorpay",
  key_id: "rzp_live_abc",
  environment: "live",
  currency: "INR",
  is_enabled: true,
  is_default: false,
  has_secret: true,
  ...over,
});

describe("provider registry", () => {
  it("describes every provider it lists", () => {
    for (const id of PROVIDER_IDS) {
      const spec = PAYMENT_PROVIDERS[id];
      expect(spec.id).toBe(id);
      expect(spec.name).toBeTruthy();
      expect(spec.currencies.length).toBeGreaterThan(0);
      expect(spec.fields.length).toBeGreaterThan(0);
    }
  });

  it("stores every secret field write-only", () => {
    for (const id of PROVIDER_IDS) {
      for (const field of PAYMENT_PROVIDERS[id].fields) {
        // Anything marked secret must land in a column the browser cannot read
        // back — key_secret and salt are excluded from the SELECT grant.
        if (field.secret) {
          expect(["key_secret", "salt", "webhook_secret"]).toContain(field.column);
        }
      }
    }
  });

  it("recognises only known providers", () => {
    expect(isPaymentProvider("razorpay")).toBe(true);
    expect(isPaymentProvider("instamojo")).toBe(true);
    expect(isPaymentProvider("stripe")).toBe(false);
    expect(isPaymentProvider(null)).toBe(false);
  });
});

describe("isGatewayReady", () => {
  it("accepts a fully configured gateway", () => {
    expect(isGatewayReady(row())).toBe(true);
  });

  it("rejects one with no stored secret", () => {
    expect(isGatewayReady(row({ has_secret: false }))).toBe(false);
  });

  it("rejects one with a missing or blank key id", () => {
    expect(isGatewayReady(row({ key_id: null }))).toBe(false);
    expect(isGatewayReady(row({ key_id: "   " }))).toBe(false);
  });

  it("does not require optional fields", () => {
    // Instamojo's salt is optional, so a row without one is still usable.
    expect(isGatewayReady(row({ provider: "instamojo", has_salt: false }))).toBe(true);
  });
});

describe("pickDefaultGateway", () => {
  it("returns null when nothing is configured", () => {
    expect(pickDefaultGateway([])).toBeNull();
  });

  it("prefers the gateway flagged as default", () => {
    const picked = pickDefaultGateway([
      row({ provider: "razorpay" }),
      row({ provider: "instamojo", is_default: true }),
    ]);
    expect(picked?.provider).toBe("instamojo");
  });

  it("falls back to the first usable gateway", () => {
    const picked = pickDefaultGateway([
      row({ provider: "razorpay" }),
      row({ provider: "instamojo" }),
    ]);
    expect(picked?.provider).toBe("razorpay");
  });

  it("skips disabled gateways", () => {
    const picked = pickDefaultGateway([
      row({ provider: "razorpay", is_enabled: false, is_default: true }),
      row({ provider: "instamojo" }),
    ]);
    expect(picked?.provider).toBe("instamojo");
  });

  it("skips a default that is not fully configured", () => {
    // A coach can flag a gateway default before finishing setup; checkout must
    // not preselect one that cannot actually take money.
    const picked = pickDefaultGateway([
      row({ provider: "razorpay", is_default: true, has_secret: false }),
      row({ provider: "instamojo" }),
    ]);
    expect(picked?.provider).toBe("instamojo");
  });

  it("returns null when every gateway is unusable", () => {
    expect(
      pickDefaultGateway([
        row({ provider: "razorpay", has_secret: false }),
        row({ provider: "instamojo", is_enabled: false }),
      ]),
    ).toBeNull();
  });
});
