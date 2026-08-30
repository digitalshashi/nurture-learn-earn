import { beforeEach, describe, expect, it } from "vitest";
import { applyMeta } from "./useSeo";
import { serviceMeta, siteMeta } from "@/lib/seo";

const ORIGIN = "https://1corehub.example";

/** The build-time defaults index.html ships with, which a page has to replace. */
function seedShellDefaults() {
  document.head.innerHTML = `
    <title>1corehub — One hub for your whole business</title>
    <meta name="description" content="Courses, community, events, CRM and payments.">
    <meta property="og:title" content="1corehub — One hub for your whole business">
    <meta property="og:image" content="/og-default.png">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  `;
}

const SERVICE = {
  id: "5b1d2b9a-0000-4000-8000-000000000001",
  slug: "sales-mastery",
  title: "Sales Mastery",
  description: "Close more deals in 30 days.",
  cover_image_url: "https://cdn.example/sales.jpg",
  price: 2999,
  currency: "INR",
};

describe("applyMeta", () => {
  beforeEach(seedShellDefaults);

  it("replaces the shell's defaults rather than adding a second set", () => {
    applyMeta(serviceMeta(SERVICE, ORIGIN));

    const images = document.head.querySelectorAll('meta[property="og:image"]');
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute("content")).toBe("https://cdn.example/sales.jpg");
    expect(document.title).toBe("Sales Mastery · 1corehub");
  });

  it("leaves tags it does not own alone", () => {
    applyMeta(serviceMeta(SERVICE, ORIGIN));
    expect(document.head.querySelector('meta[name="viewport"]')).not.toBeNull();
  });

  it("clears the previous page's tags when navigating", () => {
    applyMeta(serviceMeta(SERVICE, ORIGIN));
    applyMeta(siteMeta(ORIGIN, "/feed"));

    expect(document.head.querySelectorAll('meta[property="og:image"]')).toHaveLength(1);
    expect(
      document.head.querySelector('meta[property="og:image"]')?.getAttribute("content"),
    ).toBe(`${ORIGIN}/og-default.png`);
    expect(document.head.querySelectorAll('meta[property="product:price:amount"]')).toHaveLength(0);
  });

  it("writes exactly one JSON-LD block, as text rather than markup", () => {
    applyMeta(serviceMeta(SERVICE, ORIGIN));
    applyMeta(serviceMeta({ ...SERVICE, title: "Deal</script><script>alert(1)" }, ORIGIN));

    const blocks = document.head.querySelectorAll('script[type="application/ld+json"]');
    expect(blocks).toHaveLength(1);
    // textContent keeps the string unparsed, so the injected tag never becomes
    // an element — the head gained no extra script node above.
    expect(blocks[0].textContent).toContain("</script>");
    expect(document.head.querySelectorAll("script")).toHaveLength(1);
  });

  it("emits a canonical link, and only one", () => {
    applyMeta(serviceMeta(SERVICE, ORIGIN));
    applyMeta(serviceMeta(SERVICE, ORIGIN));

    const canonical = document.head.querySelectorAll('link[rel="canonical"]');
    expect(canonical).toHaveLength(1);
    expect(canonical[0].getAttribute("href")).toBe(`${ORIGIN}/checkout/sales-mastery`);
  });
});
