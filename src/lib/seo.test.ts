import { describe, expect, it } from "vitest";
import {
  absoluteUrl,
  courseMeta,
  escapeHtml,
  formatMoney,
  metaTags,
  plainText,
  renderMetaTags,
  serviceMeta,
  siteMeta,
  truncate,
  workshopMeta,
  type MetaTag,
} from "./seo";

const ORIGIN = "https://1corehub.example";

/** Looks up what a crawler would read for a given og/twitter/meta key. */
function tagValue(tags: MetaTag[], key: string): string | undefined {
  const found = tags.find((tag) => tag.kind === "meta" && tag.key === key);
  return found && found.kind === "meta" ? found.value : undefined;
}

function graph(tags: MetaTag[]): Record<string, unknown>[] {
  const found = tags.find((tag) => tag.kind === "jsonld");
  if (!found || found.kind !== "jsonld") return [];
  return (JSON.parse(found.json) as { "@graph": Record<string, unknown>[] })["@graph"];
}

function node(tags: MetaTag[], type: string): Record<string, unknown> | undefined {
  return graph(tags).find((entry) => entry["@type"] === type);
}

describe("primitives", () => {
  it("escapes the characters that would break out of an attribute", () => {
    expect(escapeHtml(`" onload="alert(1)`)).toBe("&quot; onload=&quot;alert(1)");
    expect(escapeHtml("Tom & Jerry <b>")).toBe("Tom &amp; Jerry &lt;b&gt;");
  });

  it("strips markup and collapses whitespace out of descriptions", () => {
    expect(plainText("<p>Learn   <b>fast</b></p>\n<p>today</p>")).toBe("Learn fast today");
    expect(plainText(null)).toBe("");
  });

  it("truncates on a word boundary", () => {
    expect(truncate("the quick brown fox jumps", 16)).toBe("the quick brown…");
    expect(truncate("short", 20)).toBe("short");
  });

  it("rejects image URLs a crawler could not fetch", () => {
    expect(absoluteUrl("/cover.png", ORIGIN)).toBe(`${ORIGIN}/cover.png`);
    expect(absoluteUrl("https://cdn.example/a.jpg", ORIGIN)).toBe("https://cdn.example/a.jpg");
    expect(absoluteUrl("javascript:alert(1)", ORIGIN)).toBeUndefined();
    expect(absoluteUrl("data:image/png;base64,AAAA", ORIGIN)).toBeUndefined();
    expect(absoluteUrl("", ORIGIN)).toBeUndefined();
  });

  it("falls back to a readable string for an unknown currency code", () => {
    expect(formatMoney(1499, "INR")).toContain("1,499");
    expect(formatMoney(20, "NOTACURRENCY")).toBe("NOTACURRENCY 20");
  });
});

describe("siteMeta", () => {
  it("indexes the home page and holds back everything behind the login", () => {
    expect(siteMeta(ORIGIN, "/").robots).toBe("index, follow");
    expect(siteMeta(ORIGIN, "/crm/leads/abc").robots).toBe("noindex, follow");
  });

  it("points at the branded card with its real dimensions", () => {
    const tags = metaTags(siteMeta(ORIGIN, "/"));
    expect(tagValue(tags, "og:image")).toBe(`${ORIGIN}/og-default.png`);
    expect(tagValue(tags, "og:image:width")).toBe("1200");
    expect(tagValue(tags, "og:image:height")).toBe("630");
  });
});

describe("serviceMeta", () => {
  const service = {
    id: "5b1d2b9a-0000-4000-8000-000000000001",
    slug: "sales-mastery",
    title: "Sales Mastery",
    description: "<p>Close more deals in 30 days.</p>",
    cover_image_url: "https://cdn.example/sales.jpg",
    price: 4999,
    discounted_price: 2999,
    currency: "INR",
    is_free: false,
  };

  it("uses the coach's cover art as the preview image", () => {
    const tags = metaTags(serviceMeta(service, ORIGIN));
    expect(tagValue(tags, "og:image")).toBe("https://cdn.example/sales.jpg");
    expect(tagValue(tags, "og:image:secure_url")).toBe("https://cdn.example/sales.jpg");
    expect(tagValue(tags, "og:image:type")).toBe("image/jpeg");
  });

  it("does not claim dimensions it cannot know for an uploaded cover", () => {
    const tags = metaTags(serviceMeta(service, ORIGIN));
    expect(tagValue(tags, "og:image:width")).toBeUndefined();
    expect(tagValue(tags, "og:image:height")).toBeUndefined();
  });

  it("prices the offer at the discounted amount, not the list price", () => {
    const tags = metaTags(serviceMeta(service, ORIGIN));
    expect(tagValue(tags, "product:price:amount")).toBe("2999.00");
    expect(tagValue(tags, "product:price:currency")).toBe("INR");
    expect(tagValue(tags, "product:availability")).toBe("in stock");

    const product = node(tags, "Product") as { offers: Record<string, string> };
    expect(product.offers.price).toBe("2999.00");
    expect(product.offers.availability).toBe("https://schema.org/InStock");
  });

  it("canonicalises to the slug URL and advertises a large card", () => {
    const tags = metaTags(serviceMeta(service, ORIGIN));
    expect(tagValue(tags, "og:url")).toBe(`${ORIGIN}/checkout/sales-mastery`);
    expect(tagValue(tags, "og:type")).toBe("product");
    expect(tagValue(tags, "twitter:card")).toBe("summary_large_image");
  });

  it("falls back to the id when the service has no slug", () => {
    const meta = serviceMeta({ ...service, slug: null }, ORIGIN);
    expect(meta.canonical).toBe(`${ORIGIN}/checkout/${service.id}`);
  });

  it("says Free rather than a zero price", () => {
    const meta = serviceMeta({ ...service, is_free: true, price: 0, discounted_price: null }, ORIGIN);
    expect(meta.description).toContain("Free");
    expect(meta.labels?.[0]).toEqual({ label: "Price", data: "Free" });
  });

  it("marks a sold-out service as such", () => {
    const tags = metaTags(serviceMeta({ ...service, max_seats: 0 }, ORIGIN));
    expect(tagValue(tags, "product:availability")).toBe("out of stock");
  });

  it("credits the coach on the card and in the offer", () => {
    const tags = metaTags(serviceMeta(service, ORIGIN, { coachName: "Asha Rao" }));
    expect(tagValue(tags, "twitter:label2")).toBe("By");
    expect(tagValue(tags, "twitter:data2")).toBe("Asha Rao");
    const product = node(tags, "Product") as { offers: { seller: Record<string, string> } };
    expect(product.offers.seller.name).toBe("Asha Rao");
  });

  it("never lets a title escape its attribute", () => {
    const html = renderMetaTags(
      serviceMeta({ ...service, title: `Deal" onload="alert(1)` }, ORIGIN),
    );
    expect(html).not.toContain(`onload="alert(1)"`);
    expect(html).toContain("&quot; onload=&quot;alert(1)");
  });

  it("neutralises a closing script tag carried in a title through to the JSON-LD", () => {
    const html = renderMetaTags(
      serviceMeta({ ...service, title: `Deal</script><script>alert(1)` }, ORIGIN),
    );
    // Exactly one script element: the JSON-LD block we opened ourselves. An
    // unescaped `</script>` in the payload would close it early and drop the
    // rest of the graph into the document as markup.
    expect(html.match(/<script/g)?.length).toBe(1);
    expect(html).toContain("\\u003c/script\\u003e");
  });

  it("strips markup out of a description before it reaches the card", () => {
    const meta = serviceMeta({ ...service, description: "<script>alert(1)</script>Real copy" }, ORIGIN);
    expect(meta.description).not.toContain("<");
    expect(meta.description).toContain("Real copy");
  });
});

describe("courseMeta", () => {
  it("previews with the thumbnail but stays out of the index", () => {
    const meta = courseMeta(
      {
        id: "8d5f7c1e-0000-4000-8000-000000000002",
        title: "Copywriting 101",
        description: "Write words that sell.",
        thumbnail_url: "https://cdn.example/copy.png",
      },
      ORIGIN,
      { coachName: "Rhea" },
    );
    const tags = metaTags(meta);
    expect(tagValue(tags, "og:image")).toBe("https://cdn.example/copy.png");
    expect(meta.robots).toBe("noindex, follow");
    expect(node(tags, "Course")?.name).toBe("Copywriting 101");
  });
});

describe("workshopMeta", () => {
  const page = {
    slug: "ai-for-coaches",
    coach_name: "Vikram Iyer",
    skill: "AI for coaches",
    core_outcome: "Automate your onboarding",
    workshop_date: "2026-09-12",
    workshop_time: "6:30 PM",
    generated_content: { title: "AI for Coaches", subtitle: "Automate the boring half of your business" },
  };

  it("describes the workshop as a scheduled online event", () => {
    const tags = metaTags(workshopMeta(page, ORIGIN));
    const event = node(tags, "Event") as Record<string, string>;
    expect(event.name).toBe("AI for Coaches");
    expect(event.startDate).toBe("2026-09-12T18:30:00");
    expect(event.eventAttendanceMode).toBe("https://schema.org/OnlineEventAttendanceMode");
  });

  it("puts the date on the card", () => {
    const meta = workshopMeta(page, ORIGIN);
    expect(meta.description).toContain("12 September 2026");
    expect(meta.labels).toContainEqual({ label: "Host", data: "Vikram Iyer" });
  });

  it("drops the date rather than emitting an invalid one", () => {
    const tags = metaTags(workshopMeta({ ...page, workshop_date: "not a date" }, ORIGIN));
    expect(node(tags, "Event")).not.toHaveProperty("startDate");
  });
});
