import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));

import { useReferralCapture } from "./useReferralCapture";
import { pendingReferralCode } from "@/lib/referral";

function Probe() {
  useReferralCapture();
  return null;
}

function visit(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Probe />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  rpc.mockClear();
});

describe("useReferralCapture", () => {
  it("records and remembers a code from the short link", () => {
    visit("/r/AB3DF");

    expect(rpc).toHaveBeenCalledWith(
      "record_referral_visit",
      expect.objectContaining({ _code: "AB3DF" }),
    );
    // Banked immediately, so the attribution survives even if the RPC never lands.
    expect(pendingReferralCode()).toBe("AB3DF");
  });

  // People forward the URL out of their own address bar, not just the pretty link.
  it("records a ?ref= code on any page", () => {
    visit("/courses?ref=ab3df");

    expect(rpc).toHaveBeenCalledWith(
      "record_referral_visit",
      expect.objectContaining({ _code: "AB3DF" }),
    );
    expect(pendingReferralCode()).toBe("AB3DF");
  });

  it("sends a visitor key so a refresh is not counted twice", () => {
    visit("/r/AB3DF");
    const [, args] = rpc.mock.calls[0] as [string, { _visitor_key: string }];
    expect(args._visitor_key).toBeTruthy();
  });

  // React 18 mounts effects twice in development; that must not be two clicks.
  it("records once per code, however many times the effect runs", () => {
    const { rerender } = visit("/r/AB3DF");
    rerender(
      <MemoryRouter initialEntries={["/r/AB3DF"]}>
        <Probe />
      </MemoryRouter>,
    );
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("does nothing on a page with no code", () => {
    visit("/courses");
    expect(rpc).not.toHaveBeenCalled();
    expect(pendingReferralCode()).toBeNull();
  });

  // A stranger arriving with a dead code still gets the page they asked for.
  it("survives the call failing", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "no such function" } });
    expect(() => visit("/r/AB3DF")).not.toThrow();
    expect(pendingReferralCode()).toBe("AB3DF");
  });
});
