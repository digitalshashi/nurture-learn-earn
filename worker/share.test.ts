import { afterEach, describe, expect, it, vi } from "vitest";
import {
  collectSitemapEntries,
  isSafeIdentifier,
  isUuid,
  matchShareRoute,
  metaForRoute,
  renderRobots,
  renderSitemap,
} from "./share";

const ORIGIN = "https://1corehub.example";
const UUID = "5b1d2b9a-0000-4000-8000-000000000001";

describe("matchShareRoute", () => {
  it("recognises the three shareable route families", () => {
    expect(matchShareRoute("/checkout/sales-mastery")).toEqual({
      kind: "service",
      idOrSlug: "sales-mastery",
    });
    expect(matchShareRoute("/workshop/ai-for-coaches")).toEqual({
      kind: "workshop",
      slug: "ai-for-coaches",
    });
    expect(matchShareRoute(`/course-player/${UUID}`)).toEqual({ kind: "course", id: UUID });
  });

  it("resolves a sub-path to the same entity as its parent", () => {
    expect(matchShareRoute("/checkout/sales-mastery/success")).toEqual({
      kind: "service",
      idOrSlug: "sales-mastery",
    });
    expect(matchShareRoute(`/course-player/${UUID}/watch/abc`)).toEqual({
      kind: "course",
      id: UUID,
    });
  });

  it("ignores routes with nothing shareable behind them", () => {
    expect(matchShareRoute("/")).toBeNull();
    expect(matchShareRoute("/feed")).toBeNull();
    expect(matchShareRoute("/checkout")).toBeNull();
    expect(matchShareRoute("/crm/leads/abc")).toBeNull();
  });

  it("refuses a course path whose id is not a uuid", () => {
    expect(matchShareRoute("/course-player/not-a-uuid")).toBeNull();
    expect(isUuid(UUID)).toBe(true);
  });

  it("rejects identifiers that would rewrite the PostgREST filter", () => {
    // `id=eq.x,title=eq.y` and `id=in.(…)` are the shapes that matter: a comma
    // or a bracket in the value changes what the filter means, not just what it
    // matches.
    expect(isSafeIdentifier("sales-mastery")).toBe(true);
    expect(isSafeIdentifier("a,b")).toBe(false);
    expect(isSafeIdentifier("a.b")).toBe(false);
    expect(isSafeIdentifier("in.(1)")).toBe(false);
    expect(isSafeIdentifier("*")).toBe(false);
    expect(isSafeIdentifier("")).toBe(false);
    expect(matchShareRoute("/checkout/a,b")).toBeNull();
    expect(matchShareRoute("/checkout/" + encodeURIComponent("x,y"))).toBeNull();
  });
});

describe("renderSitemap", () => {
  it("lists absolute URLs with a last-modified date", () => {
    const xml = renderSitemap(
      [
        { path: "/", priority: 1 },
        { path: "/checkout/pro", lastModified: "2026-08-01T10:00:00Z", priority: 0.8 },
      ],
      ORIGIN,
    );
    expect(xml).toContain(`<loc>${ORIGIN}/checkout/pro</loc>`);
    expect(xml).toContain("<lastmod>2026-08-01</lastmod>");
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });

  it("omits an unparseable date rather than emitting an invalid one", () => {
    const xml = renderSitemap([{ path: "/a", lastModified: "soon", priority: 0.5 }], ORIGIN);
    expect(xml).not.toContain("lastmod");
  });

  it("escapes a slug containing XML metacharacters", () => {
    const xml = renderSitemap([{ path: "/checkout/a&b", priority: 0.8 }], ORIGIN);
    expect(xml).toContain("&amp;");
    expect(xml).not.toMatch(/<loc>[^<]*&(?!amp;|lt;|gt;|quot;|apos;)/);
  });
});

describe("renderRobots", () => {
  it("points at the sitemap and keeps crawlers out of the gated app", () => {
    const robots = renderRobots(ORIGIN);
    expect(robots).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
    expect(robots).toContain("Disallow: /crm/");
    expect(robots).toContain("Disallow: /settings/");
  });
});

/* ------------------------------------------------------------------ *
 * Supabase reads
 * ------------------------------------------------------------------ */

const CONFIG = { supabaseUrl: "https://project.supabase.co", supabaseAnonKey: "anon-key" };

/** Answers each PostgREST call with the first matching table's rows. */
function stubSupabase(tables: Record<string, unknown[]>) {
  const calls: string[] = [];
  const fetchStub = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const table = Object.keys(tables).find((name) => url.includes(`/rest/v1/${name}?`));
    return new Response(JSON.stringify(table ? tables[table] : []), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchStub);
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("metaForRoute", () => {
  it("builds a priced product card from the service row", async () => {
    stubSupabase({
      services: [
        {
          id: UUID,
          slug: "sales-mastery",
          title: "Sales Mastery",
          description: "Close more deals.",
          cover_image_url: "https://cdn.example/sales.jpg",
          price: 4999,
          discounted_price: 2999,
          currency: "INR",
          is_free: false,
          coach_id: UUID,
        },
      ],
      profiles: [{ full_name: "Asha Rao" }],
    });

    const meta = await metaForRoute({ kind: "service", idOrSlug: "sales-mastery" }, CONFIG, ORIGIN);
    expect(meta?.title).toBe("Sales Mastery · 1corehub");
    expect(meta?.image.url).toBe("https://cdn.example/sales.jpg");
    expect(meta?.offer).toEqual({ price: 2999, currency: "INR", availability: "InStock" });
    expect(meta?.labels).toContainEqual({ label: "By", data: "Asha Rao" });
  });

  it("only filters on columns, never on a value that could reshape the query", async () => {
    const calls = stubSupabase({ services: [] });
    await metaForRoute({ kind: "service", idOrSlug: "sales-mastery" }, CONFIG, ORIGIN);
    expect(calls[0]).toContain("status=eq.active");
    expect(calls[0]).toContain("slug=eq.sales-mastery");
  });

  it("retries by id only when the identifier is actually a uuid", async () => {
    const bySlugOnly = stubSupabase({ services: [] });
    await metaForRoute({ kind: "service", idOrSlug: "legacy-link" }, CONFIG, ORIGIN);
    expect(bySlugOnly).toHaveLength(1);

    vi.unstubAllGlobals();
    const withIdRetry = stubSupabase({ services: [] });
    await metaForRoute({ kind: "service", idOrSlug: UUID }, CONFIG, ORIGIN);
    expect(withIdRetry).toHaveLength(2);
    expect(withIdRetry[1]).toContain(`id=eq.${UUID}`);
  });

  it("returns null when row-level security releases nothing", async () => {
    stubSupabase({});
    expect(await metaForRoute({ kind: "service", idOrSlug: "gone" }, CONFIG, ORIGIN)).toBeNull();
  });

  it("returns null rather than throwing when Supabase is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    expect(await metaForRoute({ kind: "workshop", slug: "ai" }, CONFIG, ORIGIN)).toBeNull();
  });

  it("reads only published courses", async () => {
    const calls = stubSupabase({
      courses: [{ id: UUID, title: "Copywriting 101", thumbnail_url: null, coach_id: UUID }],
      profiles: [{ full_name: "Rhea" }],
    });
    const meta = await metaForRoute({ kind: "course", id: UUID }, CONFIG, ORIGIN);
    expect(calls[0]).toContain("is_published=eq.true");
    // No artwork on the row, so the branded card stands in.
    expect(meta?.image.url).toBe(`${ORIGIN}/og-default.png`);
  });
});

describe("collectSitemapEntries", () => {
  it("lists the public product and workshop pages under the home page", async () => {
    stubSupabase({
      services: [{ id: UUID, slug: "pro", updated_at: "2026-08-01T00:00:00Z" }],
      landing_pages: [{ slug: "ai-workshop", updated_at: "2026-08-02T00:00:00Z" }],
    });
    const entries = await collectSitemapEntries(CONFIG);
    expect(entries.map((entry) => entry.path)).toEqual([
      "/",
      "/checkout/pro",
      "/workshop/ai-workshop",
    ]);
  });
});
