import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";

const insert = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ insert }) },
}));

import { deviceKind, referrerHost, resetTracking, sessionId, track } from "./track";

beforeEach(() => {
  insert.mockClear();
  resetTracking();
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sessionId", () => {
  it("stays the same within a session", () => {
    expect(sessionId()).toBe(sessionId());
  });

  it("survives storage being unavailable", () => {
    // Private mode throws on access. An uncounted visit is acceptable; a
    // checkout page that fails to render is not.
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(() => sessionId()).not.toThrow();
    expect(sessionId()).toMatch(/^anon_/);
    spy.mockRestore();
  });
});

describe("deviceKind", () => {
  it("maps a width onto the layout the visitor actually saw", () => {
    expect(deviceKind(390)).toBe("mobile");
    expect(deviceKind(820)).toBe("tablet");
    expect(deviceKind(1440)).toBe("desktop");
  });

  it("uses the same breakpoints the layout does", () => {
    expect(deviceKind(639)).toBe("mobile");
    expect(deviceKind(640)).toBe("tablet");
    expect(deviceKind(1023)).toBe("tablet");
    expect(deviceKind(1024)).toBe("desktop");
  });
});

describe("referrerHost", () => {
  it("keeps the host and drops the path", () => {
    // Where they came from is useful; what they were reading is not ours.
    expect(referrerHost("https://news.example.com/some/article?x=1")).toBe("news.example.com");
  });

  it("ignores our own pages, which are navigation and not a referral", () => {
    expect(referrerHost(`https://${window.location.hostname}/courses`)).toBeNull();
  });

  it("returns nothing for a direct visit or a malformed referrer", () => {
    expect(referrerHost("")).toBeNull();
    expect(referrerHost("not a url")).toBeNull();
  });
});

describe("track", () => {
  it("records an event with the coach it belongs to", async () => {
    await track({ coachId: "coach-1", event: "checkout_view", subjectType: "service", subjectId: "s1" });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toMatchObject({
      coach_id: "coach-1",
      event_type: "checkout_view",
      subject_type: "service",
      subject_id: "s1",
    });
  });

  it("records nothing without an owner", async () => {
    // An event with no coach_id belongs to nobody and would fail RLS anyway.
    await track({ coachId: null, event: "page_view" });
    await track({ coachId: undefined, event: "page_view" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("counts one visit once, however many times React renders", async () => {
    // Remounts and strict-mode double effects would otherwise inflate every
    // number built on top of this.
    await track({ coachId: "c", event: "checkout_view", subjectType: "service", subjectId: "s1" });
    await track({ coachId: "c", event: "checkout_view", subjectType: "service", subjectId: "s1" });
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("still counts a different subject or a different event", async () => {
    await track({ coachId: "c", event: "checkout_view", subjectType: "service", subjectId: "s1" });
    await track({ coachId: "c", event: "checkout_view", subjectType: "service", subjectId: "s2" });
    await track({ coachId: "c", event: "checkout_start", subjectType: "service", subjectId: "s1" });
    expect(insert).toHaveBeenCalledTimes(3);
  });

  it("never throws when recording fails", async () => {
    insert.mockRejectedValueOnce(new Error("network"));
    await expect(track({ coachId: "c", event: "page_view" })).resolves.toBeUndefined();
  });

  it("lets a failed event be retried rather than swallowing it forever", async () => {
    insert.mockRejectedValueOnce(new Error("offline"));
    await track({ coachId: "c", event: "page_view" });
    await track({ coachId: "c", event: "page_view" });
    expect(insert).toHaveBeenCalledTimes(2);
  });

  it("sends no IP address, cookie or fingerprint", async () => {
    await track({ coachId: "c", event: "page_view" });
    const sent = Object.keys(insert.mock.calls[0][0]);
    expect(sent).not.toContain("ip_address");
    expect(sent).not.toContain("user_agent");
    expect(sent).not.toContain("fingerprint");
  });
});

describe("where tracking is wired in", () => {
  const checkout = readFileSync("src/pages/ServiceCheckout.tsx", "utf8");
  const publicPage = readFileSync("src/pages/PublicPage.tsx", "utf8");
  const migration = readFileSync(
    "supabase/migrations/20260830090000_analytics_events.sql",
    "utf8",
  );

  it("records both ends of the checkout funnel", () => {
    // Without both, "conversion rate" has no denominator and no middle step.
    expect(checkout).toContain('event: "checkout_view"');
    expect(checkout).toContain('event: "checkout_start"');
  });

  it("never awaits tracking on the buyer's path", () => {
    // A slow analytics insert must not delay a checkout.
    expect(checkout).toContain("void track({");
    expect(publicPage).toContain("void track({");
  });

  it("records a view of a published page", () => {
    expect(publicPage).toContain('event: "page_view"');
  });

  it("lets a signed-out visitor be counted but never read back", () => {
    expect(migration).toMatch(/FOR INSERT TO anon, authenticated/);
    expect(migration).toMatch(/REVOKE ALL ON public\.analytics_events FROM anon/);
    // Only the coach it belongs to, and platform admins, may read.
    expect(migration).toMatch(/FOR SELECT TO authenticated\s+USING \(coach_id = auth\.uid\(\)\)/);
  });

  it("stores no IP address column at all", () => {
    expect(migration).not.toMatch(/ip_address/);
  });
});
