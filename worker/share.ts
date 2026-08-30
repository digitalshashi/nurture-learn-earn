/**
 * Route matching and Supabase reads for edge-rendered share previews.
 *
 * Split out from `index.ts` so the parts with real logic — which path is
 * shareable, which identifier form it carries, how a filter value is made safe
 * — are plain functions that unit-test without a Workers runtime.
 */
import {
  courseMeta,
  serviceMeta,
  workshopMeta,
  type PageMeta,
  type ShareableCourse,
  type ShareableLandingPage,
  type ShareableService,
} from "../src/lib/seo";

export interface Env {
  ASSETS: Fetcher;
  /** Optional overrides; normally read from the emitted share-config.json. */
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

export interface ShareConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/* ------------------------------------------------------------------ *
 * Routing
 * ------------------------------------------------------------------ */

export type ShareRoute =
  | { kind: "service"; idOrSlug: string }
  | { kind: "workshop"; slug: string }
  | { kind: "course"; id: string };

/**
 * PostgREST filters are expressed in the query string, so an unescaped value
 * containing `,` `(` `)` or `.` changes the *shape* of the filter rather than
 * just its operand. Ids are UUIDs and slugs are generated from titles, so
 * nothing legitimate falls outside this set — anything that does is treated as
 * "no such page" and gets the default card.
 */
const SAFE_IDENTIFIER = /^[A-Za-z0-9_-]{1,128}$/;

export function isSafeIdentifier(value: string): boolean {
  return SAFE_IDENTIFIER.test(value);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

/**
 * Maps a request path to the entity whose preview it should carry. Sub-paths
 * resolve to the same entity as their parent: `/checkout/x/success` is still
 * the same product, and `/course-player/x/watch/y` is still the same course,
 * so a link copied from anywhere inside them previews correctly.
 */
export function matchShareRoute(pathname: string): ShareRoute | null {
  const segments = pathname.split("/").filter(Boolean).map(decodeSegment);
  if (segments.length < 2) return null;

  const [head, value] = segments;
  if (!value || !isSafeIdentifier(value)) return null;

  if (head === "checkout") return { kind: "service", idOrSlug: value };
  if (head === "workshop") return { kind: "workshop", slug: value };
  if (head === "course-player") return isUuid(value) ? { kind: "course", id: value } : null;
  return null;
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/* ------------------------------------------------------------------ *
 * Configuration
 * ------------------------------------------------------------------ */

let cachedConfig: ShareConfig | null | undefined;

/**
 * The Supabase project the site was built against.
 *
 * Read from `share-config.json`, which the Vite build writes from the same
 * `VITE_SUPABASE_*` values it bakes into the bundle. That indirection is what
 * lets the Worker follow the app to a different Supabase project without a
 * second set of deploy secrets — and it is why the credentials are never
 * committed. The values are the browser-safe URL and anon key, already public
 * in the JS bundle; every read below is still subject to row-level security.
 */
export async function loadShareConfig(env: Env, origin: string): Promise<ShareConfig | null> {
  if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
    return { supabaseUrl: env.SUPABASE_URL, supabaseAnonKey: env.SUPABASE_ANON_KEY };
  }
  if (cachedConfig !== undefined) return cachedConfig;

  try {
    const response = await env.ASSETS.fetch(new Request(new URL("/share-config.json", origin)));
    if (!response.ok) {
      cachedConfig = null;
      return null;
    }
    const parsed = (await response.json()) as Partial<ShareConfig>;
    cachedConfig =
      parsed.supabaseUrl && parsed.supabaseAnonKey
        ? { supabaseUrl: parsed.supabaseUrl, supabaseAnonKey: parsed.supabaseAnonKey }
        : null;
  } catch {
    cachedConfig = null;
  }
  return cachedConfig;
}

/* ------------------------------------------------------------------ *
 * Supabase reads
 * ------------------------------------------------------------------ */

/** A crawler that waits is a crawler that gives up; fall back rather than hang. */
const QUERY_TIMEOUT_MS = 2500;

async function restSelect<T>(
  config: ShareConfig,
  table: string,
  query: string,
): Promise<T[] | null> {
  try {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/${table}?${query}`, {
      headers: {
        apikey: config.supabaseAnonKey,
        authorization: `Bearer ${config.supabaseAnonKey}`,
        accept: "application/json",
      },
      signal: AbortSignal.timeout(QUERY_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return (await response.json()) as T[];
  } catch {
    // Network error, timeout, or malformed JSON. The caller degrades to the
    // branded default card; a share preview is never worth a 500.
    return null;
  }
}

const SERVICE_COLUMNS = [
  "id",
  "slug",
  "title",
  "description",
  "cover_image_url",
  "price",
  "discounted_price",
  "currency",
  "is_free",
  "max_seats",
  "service_type",
  "enable_subscription",
  "subscription_price",
  "subscription_interval",
  "coach_id",
].join(",");

const COURSE_COLUMNS = [
  "id",
  "title",
  "description",
  "thumbnail_url",
  "cover_image_url",
  "category",
  "price",
  "coach_id",
].join(",");

const LANDING_COLUMNS = [
  "slug",
  "coach_name",
  "skill",
  "core_outcome",
  "thumbnail_url",
  "mentor_image_url",
  "workshop_date",
  "workshop_time",
  "generated_content",
].join(",");

/** `full_name` is the only profile column granted to anon. */
async function coachName(config: ShareConfig, coachId: string | undefined): Promise<string | null> {
  if (!coachId || !isUuid(coachId)) return null;
  const rows = await restSelect<{ full_name: string | null }>(
    config,
    "profiles",
    `select=full_name&id=eq.${coachId}&limit=1`,
  );
  return rows?.[0]?.full_name ?? null;
}

async function fetchService(
  config: ShareConfig,
  idOrSlug: string,
): Promise<(ShareableService & { coach_id?: string }) | null> {
  const bySlug = await restSelect<ShareableService & { coach_id?: string }>(
    config,
    "services",
    `select=${SERVICE_COLUMNS}&status=eq.active&slug=eq.${idOrSlug}&limit=1`,
  );
  if (bySlug?.[0]) return bySlug[0];

  // Services created before slugs existed are linked by bare id.
  if (!isUuid(idOrSlug)) return null;
  const byId = await restSelect<ShareableService & { coach_id?: string }>(
    config,
    "services",
    `select=${SERVICE_COLUMNS}&status=eq.active&id=eq.${idOrSlug}&limit=1`,
  );
  return byId?.[0] ?? null;
}

/**
 * Builds the preview for a route, or returns null so the caller falls back to
 * the site-wide card. Null covers every failure — unknown slug, RLS denying
 * the read, Supabase unreachable — because they all mean the same thing here.
 */
export async function metaForRoute(
  route: ShareRoute,
  config: ShareConfig,
  origin: string,
): Promise<PageMeta | null> {
  if (route.kind === "service") {
    const service = await fetchService(config, route.idOrSlug);
    if (!service) return null;
    return serviceMeta(service, origin, { coachName: await coachName(config, service.coach_id) });
  }

  if (route.kind === "workshop") {
    const rows = await restSelect<ShareableLandingPage>(
      config,
      "landing_pages",
      `select=${LANDING_COLUMNS}&status=eq.published&slug=eq.${route.slug}&limit=1`,
    );
    return rows?.[0] ? workshopMeta(rows[0], origin) : null;
  }

  const rows = await restSelect<ShareableCourse & { coach_id?: string }>(
    config,
    "courses",
    `select=${COURSE_COLUMNS}&is_published=eq.true&id=eq.${route.id}&limit=1`,
  );
  const course = rows?.[0];
  if (!course) return null;
  return courseMeta(course, origin, { coachName: await coachName(config, course.coach_id) });
}

/* ------------------------------------------------------------------ *
 * Sitemap
 * ------------------------------------------------------------------ */

export interface SitemapEntry {
  path: string;
  lastModified?: string | null;
  /** 0.0–1.0. Products rank above the marketing pages that feed them. */
  priority: number;
}

/** Every publicly reachable, indexable URL. The app itself is all behind auth. */
export async function collectSitemapEntries(config: ShareConfig): Promise<SitemapEntry[]> {
  const [services, pages] = await Promise.all([
    restSelect<{ id: string; slug: string | null; updated_at: string | null }>(
      config,
      "services",
      "select=id,slug,updated_at&status=eq.active&order=updated_at.desc&limit=2000",
    ),
    restSelect<{ slug: string; updated_at: string | null }>(
      config,
      "landing_pages",
      "select=slug,updated_at&status=eq.published&order=updated_at.desc&limit=2000",
    ),
  ]);

  return [
    { path: "/", priority: 1 },
    ...(services ?? []).map((service) => ({
      path: `/checkout/${service.slug || service.id}`,
      lastModified: service.updated_at,
      priority: 0.8,
    })),
    ...(pages ?? []).map((page) => ({
      path: `/workshop/${page.slug}`,
      lastModified: page.updated_at,
      priority: 0.7,
    })),
  ];
}

export function renderSitemap(entries: SitemapEntry[], origin: string): string {
  const urls = entries
    .map((entry) => {
      const lastModified = toIsoDate(entry.lastModified);
      return [
        "  <url>",
        `    <loc>${xmlEscape(new URL(entry.path, origin).toString())}</loc>`,
        lastModified ? `    <lastmod>${lastModified}</lastmod>` : "",
        `    <priority>${entry.priority.toFixed(1)}</priority>`,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function toIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderRobots(origin: string): string {
  return [
    "User-agent: *",
    "Allow: /",
    "",
    "# Nothing behind the login wall is useful to a crawler — it only ever sees",
    "# the empty app shell — and the paths carry course, lead and member ids.",
    "Disallow: /crm/",
    "Disallow: /settings/",
    "Disallow: /super-admin",
    "Disallow: /admin",
    "Disallow: /messages",
    "Disallow: /my-account",
    "Disallow: /profile/",
    "",
    `Sitemap: ${new URL("/sitemap.xml", origin).toString()}`,
    "",
  ].join("\n");
}
