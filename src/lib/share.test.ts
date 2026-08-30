import { describe, expect, it } from "vitest";
import { instagramCaption, qrCodeUrl, serviceShareUrl, shareTarget, withUtm } from "./share";

const SUBJECT = {
  url: "https://1corehub.example/checkout/sales-mastery",
  title: "Sales Mastery",
  text: "Close more deals in 30 days.",
};

describe("withUtm", () => {
  it("tags the link with the channel it went out on", () => {
    const tagged = new URL(withUtm(SUBJECT.url, "whatsapp"));
    expect(tagged.searchParams.get("utm_source")).toBe("whatsapp");
    expect(tagged.searchParams.get("utm_medium")).toBe("social");
    expect(tagged.searchParams.get("utm_campaign")).toBe("share");
  });

  it("keeps parameters the link already carried", () => {
    const tagged = new URL(withUtm(`${SUBJECT.url}?ref=abc`, "x"));
    expect(tagged.searchParams.get("ref")).toBe("abc");
  });

  it("returns a malformed URL untouched instead of throwing", () => {
    expect(withUtm("not a url", "x")).toBe("not a url");
  });
});

describe("shareTarget", () => {
  it("puts the link last in a WhatsApp message so the preview attaches to it", () => {
    const { href } = shareTarget("whatsapp", SUBJECT);
    const text = decodeURIComponent(new URL(href).searchParams.get("text") ?? "");
    const lastLine = text.trimEnd().split("\n").pop() ?? "";
    expect(text.startsWith("Sales Mastery")).toBe(true);
    expect(lastLine.startsWith(SUBJECT.url)).toBe(true);
    expect(lastLine).toContain("utm_source=whatsapp");
  });

  it("sends Facebook only the URL, since it reads the rest off the page", () => {
    const { href } = shareTarget("facebook", SUBJECT);
    const shared = new URL(href).searchParams.get("u");
    expect(shared).toContain("/checkout/sales-mastery");
    expect(new URL(href).searchParams.get("text")).toBeNull();
  });

  it("splits text and url for X and LinkedIn", () => {
    expect(new URL(shareTarget("x", SUBJECT).href).searchParams.get("url")).toContain(
      "utm_source=x",
    );
    expect(new URL(shareTarget("linkedin", SUBJECT).href).searchParams.get("url")).toContain(
      "utm_source=linkedin",
    );
  });

  it("marks Instagram as copy-only, because it has no web share endpoint", () => {
    const target = shareTarget("instagram", SUBJECT);
    expect(target.copyOnly).toBe(true);
    expect(target.href).toBe("");
    expect(instagramCaption(SUBJECT, SUBJECT.url)).toContain(SUBJECT.url);
  });

  it("builds a mailto with the title as the subject", () => {
    const { href } = shareTarget("email", SUBJECT);
    expect(href.startsWith("mailto:?subject=Sales%20Mastery")).toBe(true);
  });
});

describe("link builders", () => {
  it("prefers a slug over an id", () => {
    expect(serviceShareUrl("https://x.test", { id: "abc", slug: "pro-plan" })).toBe(
      "https://x.test/checkout/pro-plan",
    );
    expect(serviceShareUrl("https://x.test", { id: "abc", slug: null })).toBe(
      "https://x.test/checkout/abc",
    );
  });

  it("encodes the target inside the QR image URL", () => {
    expect(qrCodeUrl(SUBJECT.url)).toContain(encodeURIComponent("https://1corehub.example"));
  });
});
