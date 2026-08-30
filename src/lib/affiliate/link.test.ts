import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  absoluteAffiliateUrl,
  affiliateCodeFromSearch,
  checkoutPath,
  clearPendingAffiliate,
  commissionFor,
  maskAccount,
  pendingAffiliate,
  rememberAffiliate,
} from "./link";

beforeEach(() => {
  window.localStorage.clear();
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("affiliateCodeFromSearch", () => {
  it("reads the code an affiliate link carries", () => {
    expect(affiliateCodeFromSearch("?affiliate=ab3df9")).toBe("AB3DF9");
  });

  it("normalises the way the referral code does, so both halves agree", () => {
    expect(affiliateCodeFromSearch("?affiliate=+ab-3d+f9+")).toBe("AB3DF9");
  });

  // ?ref= belongs to the referral capture hook. Reading it here would record a
  // product click for a link that never named a product.
  it("ignores a referral code", () => {
    expect(affiliateCodeFromSearch("?ref=AB3DF9")).toBeNull();
  });

  it("is absent when there is no query at all", () => {
    expect(affiliateCodeFromSearch("")).toBeNull();
  });
});

describe("checkoutPath", () => {
  // The path is compared against checkout_base_url by string equality in
  // Postgres, so a trailing slash is the difference between a commission and
  // no commission.
  it("strips a trailing slash", () => {
    expect(checkoutPath("/checkout/inner-circle/")).toBe("/checkout/inner-circle");
  });

  it("keeps a bare root, which has nothing to strip", () => {
    expect(checkoutPath("/")).toBe("/");
  });

  it("drops the query and the fragment", () => {
    expect(checkoutPath("/checkout/thing?affiliate=AB3DF9#pay")).toBe("/checkout/thing");
  });
});

describe("absoluteAffiliateUrl", () => {
  // Links are stored relative because this platform serves white-label
  // domains: the right origin is whichever one the member is looking at.
  it("prefixes the origin the member is on", () => {
    expect(absoluteAffiliateUrl("https://learn.example.com", "/checkout/x?affiliate=AB3DF9")).toBe(
      "https://learn.example.com/checkout/x?affiliate=AB3DF9",
    );
  });

  it("does not double the slash when the origin has one", () => {
    expect(absoluteAffiliateUrl("https://learn.example.com/", "/checkout/x")).toBe(
      "https://learn.example.com/checkout/x",
    );
  });

  it("leaves an already-absolute link alone", () => {
    expect(absoluteAffiliateUrl("https://a.com", "https://b.com/checkout/x")).toBe(
      "https://b.com/checkout/x",
    );
  });

  it("is empty rather than a bare origin when there is no link yet", () => {
    expect(absoluteAffiliateUrl("https://a.com", null)).toBe("");
  });
});

describe("holding a claim between the click and the purchase", () => {
  it("keeps the code and the path the click landed on", () => {
    rememberAffiliate("ab3df9", "/checkout/inner-circle");
    expect(pendingAffiliate()).toMatchObject({
      code: "AB3DF9",
      path: "/checkout/inner-circle",
    });
  });

  it("stores the path already stripped, so the claim matches the product", () => {
    rememberAffiliate("AB3DF9", "/checkout/inner-circle/?affiliate=AB3DF9");
    expect(pendingAffiliate()?.path).toBe("/checkout/inner-circle");
  });

  it("ignores a blank code rather than storing an empty claim", () => {
    rememberAffiliate("   ", "/checkout/x");
    expect(pendingAffiliate()).toBeNull();
  });

  // A click from last winter should not pay a commission on a purchase today.
  it("expires once the attribution window has passed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    rememberAffiliate("AB3DF9", "/checkout/x", 30);

    vi.setSystemTime(new Date("2026-01-20T00:00:00Z"));
    expect(pendingAffiliate()).not.toBeNull();

    vi.setSystemTime(new Date("2026-03-01T00:00:00Z"));
    expect(pendingAffiliate()).toBeNull();
  });

  it("reads a value left by an older build as absent rather than throwing", () => {
    window.localStorage.setItem("affiliate:pending", "{not json");
    expect(pendingAffiliate()).toBeNull();

    window.localStorage.setItem("affiliate:pending", JSON.stringify({ code: "AB3DF9" }));
    expect(pendingAffiliate()).toBeNull();
  });

  it("clears once the claim has been recorded", () => {
    rememberAffiliate("AB3DF9", "/checkout/x");
    clearPendingAffiliate();
    expect(pendingAffiliate()).toBeNull();
  });

  it("survives storage being unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(() => rememberAffiliate("AB3DF9", "/checkout/x")).not.toThrow();
  });
});

describe("maskAccount", () => {
  it("shows only the last four digits", () => {
    expect(maskAccount("4821")).toBe("•••• 4821");
  });

  it("degrades to dots when nothing was stored", () => {
    expect(maskAccount(null)).toBe("••••");
    expect(maskAccount("")).toBe("••••");
  });
});

describe("commissionFor", () => {
  it("takes the configured percentage of what was paid", () => {
    expect(commissionFor(4999, 20)).toBeCloseTo(999.8);
  });

  // A product configured at 0% earns nothing, and should say so cleanly
  // rather than showing a rounded-away fraction.
  it("is zero when no commission is configured", () => {
    expect(commissionFor(4999, 0)).toBe(0);
  });

  it("is zero rather than NaN when a figure is missing", () => {
    expect(commissionFor(Number.NaN, 20)).toBe(0);
    expect(commissionFor(4999, Number.NaN)).toBe(0);
  });
});
