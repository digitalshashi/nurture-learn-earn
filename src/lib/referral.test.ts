import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  clearPendingReferral,
  codeFromLocation,
  normaliseCode,
  pendingReferralCode,
  referralUrl,
  rememberReferral,
  visitorKey,
} from "./referral";

beforeEach(() => {
  window.localStorage.clear();
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("normaliseCode", () => {
  it("uppercases and strips anything that is not a code character", () => {
    expect(normaliseCode(" ab-3d f ")).toBe("AB3DF");
    expect(normaliseCode(null)).toBe("");
  });

  it("refuses to grow without bound", () => {
    expect(normaliseCode("A".repeat(200))).toHaveLength(16);
  });
});

describe("remembering a referral", () => {
  it("holds the code and hands it back", () => {
    rememberReferral("ab3df");
    expect(pendingReferralCode()).toBe("AB3DF");
  });

  it("ignores an empty code rather than storing a blank", () => {
    rememberReferral("   ");
    expect(pendingReferralCode()).toBeNull();
  });

  // A click from last winter should not be credited to a signup today.
  it("expires once the attribution window has passed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T00:00:00Z"));
    rememberReferral("AB3DF", 30);

    vi.setSystemTime(new Date("2026-03-25T00:00:00Z"));
    expect(pendingReferralCode()).toBe("AB3DF");

    vi.setSystemTime(new Date("2026-04-05T00:00:00Z"));
    expect(pendingReferralCode()).toBeNull();
  });

  it("clears once the signup has used it", () => {
    rememberReferral("AB3DF");
    clearPendingReferral();
    expect(pendingReferralCode()).toBeNull();
  });

  // A value left by an older build must not break the signup form.
  it("treats a corrupt entry as no referral", () => {
    window.localStorage.setItem("referral:pending", "not json");
    expect(pendingReferralCode()).toBeNull();

    window.localStorage.setItem("referral:pending", JSON.stringify({ code: 42 }));
    expect(pendingReferralCode()).toBeNull();
  });
});

describe("when storage is unavailable", () => {
  // Some privacy modes throw on any localStorage access.
  it("degrades to no referral instead of throwing", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });

    expect(() => rememberReferral("AB3DF")).not.toThrow();
    expect(pendingReferralCode()).toBeNull();
    expect(() => clearPendingReferral()).not.toThrow();
    expect(visitorKey()).toBeTruthy();
  });
});

describe("visitorKey", () => {
  it("stays the same across calls", () => {
    const first = visitorKey();
    expect(visitorKey()).toBe(first);
    expect(first.length).toBeGreaterThan(8);
  });
});

describe("reading a code off a URL", () => {
  it("reads the short link", () => {
    expect(codeFromLocation("/r/AB3DF", "")).toBe("AB3DF");
    expect(codeFromLocation("/r/ab3df/", "")).toBe("AB3DF");
  });

  it("reads ?ref= on any page, which is what people paste", () => {
    expect(codeFromLocation("/courses", "?ref=ab3df")).toBe("AB3DF");
    expect(codeFromLocation("/", "?utm_source=x&ref=AB3DF")).toBe("AB3DF");
  });

  it("is null when there is no code", () => {
    expect(codeFromLocation("/courses", "")).toBeNull();
    expect(codeFromLocation("/r/", "")).toBeNull();
    expect(codeFromLocation("/courses", "?ref=")).toBeNull();
  });
});

describe("referralUrl", () => {
  it("builds the link a member shares", () => {
    expect(referralUrl("https://app.example.com", "ab3df")).toBe("https://app.example.com/r/AB3DF");
  });

  it("does not double the slash", () => {
    expect(referralUrl("https://app.example.com/", "AB3DF")).toBe("https://app.example.com/r/AB3DF");
  });
});
