/**
 * The edge in front of the 1corehub SPA.
 *
 * It exists for one reason: no social crawler runs JavaScript. WhatsApp,
 * Facebook, X, LinkedIn, Telegram, Slack and iMessage all fetch the URL once,
 * read `<head>`, and render whatever they find there. A Vite SPA serves the
 * same empty shell for every route, so without this every shared link — a
 * ₹4,999 course, a live workshop, a checkout page — previewed identically and
 * imagelessly.
 *
 * So every HTML response gets its `<head>` rewritten on the way out: share
 * routes with the real entity's title, description, price and image, everything
 * else with the branded default resolved against the live origin. Hashed build
 * assets never reach this Worker at all (see `run_worker_first` in
 * wrangler.jsonc).
 *
 * Failure is always soft: a slug that does not exist, a row RLS will not
 * release, a Supabase outage — all of them fall back to the branded default
 * card, and the page itself still loads.
 */
import { MANAGED_META_KEYS, renderMetaTags, siteMeta, type PageMeta } from "../src/lib/seo";
import {
  collectSitemapEntries,
  loadShareConfig,
  matchShareRoute,
  metaForRoute,
  renderRobots,
  renderSitemap,
  type Env,
  type ShareRoute,
} from "./share";

/** Long enough that a burst of shares costs one origin read, short enough that
 *  a coach fixing a typo sees it reflected within the minute they expect. */
const META_TTL_SECONDS = 300;
const SITEMAP_TTL_SECONDS = 3600;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method !== "GET" && request.method !== "HEAD") {
      return env.ASSETS.fetch(request);
    }

    if (url.pathname === "/robots.txt") {
      return text(renderRobots(url.origin), "text/plain; charset=utf-8", SITEMAP_TTL_SECONDS);
    }

    if (url.pathname === "/sitemap.xml") {
      return handleSitemap(env, url, ctx);
    }

    const response = await env.ASSETS.fetch(request);

    // Images, fonts, the manifest, the service worker: nothing to rewrite.
    if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) {
      return response;
    }

    const route = matchShareRoute(url.pathname);
    const meta =
      (route && (await resolveMeta(route, env, url, ctx))) ?? siteMeta(url.origin, url.pathname);

    return injectMeta(response, meta);
  },
} satisfies ExportedHandler<Env>;

/**
 * Reads the entity behind a share route, going to Supabase at most once every
 * `META_TTL_SECONDS` per URL.
 *
 * Only the metadata is cached, never the rendered HTML: the shell names hashed
 * asset files that a deploy replaces, and serving a five-minute-old shell would
 * point browsers at bundles that no longer exist. Caching the expensive half
 * and re-rendering the cheap half every time avoids that entirely.
 */
async function resolveMeta(
  route: ShareRoute,
  env: Env,
  url: URL,
  ctx: ExecutionContext,
): Promise<PageMeta | null> {
  // A synthetic key, not the page URL — the page URL's cache entry belongs to
  // the HTML. Query strings are share tracking (utm_*, referral codes) and do
  // not change the metadata, so one entry serves every tagged variant.
  const cacheKey = new Request(`${url.origin}/__share-meta${url.pathname}`, { method: "GET" });

  const cached = await cacheMatch(cacheKey);
  if (cached) {
    try {
      return (await cached.json()) as PageMeta;
    } catch {
      /* fall through and re-read from the origin */
    }
  }

  const config = await loadShareConfig(env, url.origin);
  const meta = config ? await metaForRoute(route, config, url.origin) : null;
  if (!meta) return null;

  ctx.waitUntil(
    cachePut(
      cacheKey,
      new Response(JSON.stringify(meta), {
        headers: {
          "content-type": "application/json",
          "cache-control": `public, max-age=${META_TTL_SECONDS}`,
        },
      }),
    ),
  );
  return meta;
}

/**
 * Rewrites `<head>` in a single streaming pass: the shell's build-time defaults
 * are dropped, then the page's own tags are appended. Removing first matters —
 * two `og:image` tags leave the crawler to pick, and it will not pick the one
 * you meant.
 */
function injectMeta(shell: Response, meta: PageMeta): Response {
  const rendered = new HTMLRewriter()
    .on("title", {
      element(element) {
        element.setInnerContent(meta.title);
      },
    })
    .on("meta", {
      element(element) {
        const key = element.getAttribute("property") ?? element.getAttribute("name");
        if (key && MANAGED_META_KEYS.test(key)) element.remove();
      },
    })
    .on('link[rel="canonical"]', {
      element(element) {
        element.remove();
      },
    })
    .on('script[type="application/ld+json"]', {
      element(element) {
        element.remove();
      },
    })
    .on("head", {
      element(element) {
        element.append(`\n    ${renderMetaTags(meta)}\n  `, { html: true });
      },
    })
    .transform(shell);

  // Preserve the security headers the asset layer applied from public/_headers,
  // and override only what this response has to say for itself.
  const headers = new Headers(rendered.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "public, max-age=0, must-revalidate");
  headers.delete("content-length"); // the body length changed
  headers.delete("etag"); // and the shell's validator no longer describes it

  return new Response(rendered.body, { status: 200, headers });
}

async function handleSitemap(env: Env, url: URL, ctx: ExecutionContext): Promise<Response> {
  const cacheKey = new Request(`${url.origin}/sitemap.xml`, { method: "GET" });
  const cached = await cacheMatch(cacheKey);
  if (cached) return cached;

  const config = await loadShareConfig(env, url.origin);
  const entries = config ? await collectSitemapEntries(config) : [{ path: "/", priority: 1 }];
  const response = text(
    renderSitemap(entries, url.origin),
    "application/xml; charset=utf-8",
    SITEMAP_TTL_SECONDS,
  );
  ctx.waitUntil(cachePut(cacheKey, response.clone()));
  return response;
}

function text(body: string, contentType: string, ttl: number): Response {
  return new Response(body, {
    headers: {
      "content-type": contentType,
      "cache-control": `public, max-age=0, s-maxage=${ttl}`,
      "x-content-type-options": "nosniff",
    },
  });
}

// `caches.default` is unavailable in some local runtimes, and a cache miss is
// always a valid outcome, so neither helper is allowed to throw.
async function cacheMatch(key: Request): Promise<Response | undefined> {
  try {
    return await caches.default.match(key);
  } catch {
    return undefined;
  }
}

async function cachePut(key: Request, response: Response): Promise<void> {
  try {
    await caches.default.put(key, response);
  } catch {
    /* caching is an optimisation, never a requirement */
  }
}
