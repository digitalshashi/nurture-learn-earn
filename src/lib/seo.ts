/**
 * The single source of truth for what a 1corehub link looks like when it is
 * pasted into WhatsApp, X, Facebook, LinkedIn, Telegram, Slack or iMessage.
 *
 * Deliberately isomorphic — no `window`, no `document`, no DOM types — because
 * two very different callers share it:
 *
 *   • `worker/index.ts` renders these tags into the HTML shell at the edge,
 *     which is the only version a social crawler ever sees (none of them run
 *     the app's JavaScript, so a client-only `document.title` is invisible to
 *     WhatsApp and friends);
 *   • `src/hooks/useSeo.ts` applies the identical set in the browser, for the
 *     tab title, for in-app navigation, and for crawlers that do render (Google).
 *
 * Keeping one builder means the crawler and the browser can never disagree
 * about a page's title, price or image.
 */
import { BRAND, pageTitle } from "./brand";
// Pure string work, no DOM — safe for the edge Worker that also imports this.
import { richTextToPlain } from "./richText";

export type OgType = "website" | "product" | "article" | "profile";

export type Availability = "InStock" | "SoldOut" | "PreOrder";

export interface ShareImage {
  /** Absolute https URL. Crawlers reject relative and http-only images. */
  url: string;
  alt: string;
  width?: number;
  height?: number;
  mime?: string;
}

export interface Offer {
  /** Major units (rupees, not paise). */
  price: number;
  /** ISO 4217, e.g. "INR". */
  currency: string;
  availability: Availability;
}

export interface PageMeta {
  title: string;
  description: string;
  /** Absolute URL, query and hash stripped. */
  canonical: string;
  image: ShareImage;
  type: OgType;
  /** `og:site_name` — the coach's brand where one is set, else the platform. */
  siteName: string;
  robots: string;
  offer?: Offer;
  /** X renders up to two of these as a metadata row under the card. */
  labels?: { label: string; data: string }[];
  jsonLd: Record<string, unknown>[];
}

/* ------------------------------------------------------------------ *
 * Primitives
 * ------------------------------------------------------------------ */

/**
 * Escapes for an HTML *attribute* value. Titles and descriptions come out of
 * the database, so a service called `" onload="…` would otherwise break out of
 * the attribute and inject script into every crawler and browser that loads the
 * page. Single quotes are escaped too since not every emitted attribute is
 * double-quoted by hand.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * `</script>` inside a JSON-LD block closes the block early — the rest of the
 * payload then lands in the document as markup. Escaping the slash keeps the
 * JSON valid while making the sequence unrecognisable to the HTML parser.
 */
export function escapeJsonLd(json: string): string {
  return json.replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

/**
 * Strips markup and collapses whitespace, for descriptions authored as HTML
 * or in the formatting syntax of src/lib/richText.ts. A share card must never
 * show a coach's asterisks, so both are taken off before anything is
 * truncated for a meta tag.
 */
export function plainText(value: string | null | undefined): string {
  if (!value) return "";
  return richTextToPlain(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Truncates on a word boundary so previews never end mid-word. */
export function truncate(value: string, max: number): string {
  const text = value.trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

const IMAGE_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Resolves a stored image path against the site origin and rejects anything a
 * crawler could not fetch, or that we would not want it to fetch: `data:` and
 * `javascript:` URLs, and blobs. Returns `undefined` so the caller falls back
 * to the branded card rather than emitting a broken `og:image`.
 */
export function absoluteUrl(
  raw: string | null | undefined,
  origin: string,
): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed, origin);
    return IMAGE_PROTOCOLS.has(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

const MIME_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

/** Best-effort `og:image:type`; omitted when the URL carries no extension. */
export function imageMime(url: string): string | undefined {
  const path = url.split("?")[0].split("#")[0];
  const extension = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  return MIME_BY_EXTENSION[extension];
}

/** The branded 1200x630 card, used whenever an entity has no image of its own. */
export function defaultImage(origin: string, alt: string = BRAND.name): ShareImage {
  return {
    url: new URL(BRAND.assets.ogImage, origin).toString(),
    alt,
    width: BRAND.assets.ogImageWidth,
    height: BRAND.assets.ogImageHeight,
    mime: "image/png",
  };
}

/**
 * `Intl.NumberFormat` throws a RangeError on a currency code it does not
 * recognise, and `services.currency` is free text on a coach-managed row — so
 * a typo there must not take down the whole share card.
 */
export function formatMoney(amount: number, currency: string): string {
  const code = (currency || "INR").toUpperCase();
  try {
    return new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${code} ${amount}`;
  }
}

/** Strips query and hash: shared links carry UTM tags, canonicals must not. */
export function canonicalUrl(origin: string, pathname: string): string {
  const url = new URL(pathname, origin);
  return `${url.origin}${url.pathname}`;
}

const MAX_TITLE = 90;
const MAX_DESCRIPTION = 200;

/* ------------------------------------------------------------------ *
 * Page builders
 * ------------------------------------------------------------------ */

function organizationLd(origin: string): Record<string, unknown> {
  return {
    "@type": "Organization",
    "@id": `${origin}/#organization`,
    name: BRAND.legalName,
    url: `${origin}/`,
    logo: new URL(BRAND.assets.ogImage, origin).toString(),
    description: BRAND.description,
  };
}

function breadcrumbLd(
  origin: string,
  trail: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: new URL(crumb.path, origin).toString(),
    })),
  };
}

/** The card every unremarkable route falls back to. */
export function siteMeta(origin: string, pathname = "/"): PageMeta {
  return {
    title: pageTitle(),
    description: BRAND.description,
    canonical: canonicalUrl(origin, pathname),
    image: defaultImage(origin, `${BRAND.name} — ${BRAND.tagline}`),
    type: "website",
    siteName: BRAND.name,
    // Everything behind the login wall is noindex: the crawler would only ever
    // see an empty shell, and indexing /crm/leads/<id> style paths leaks ids.
    robots: pathname === "/" ? "index, follow" : "noindex, follow",
    jsonLd: [
      organizationLd(origin),
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: BRAND.name,
        url: `${origin}/`,
        publisher: { "@id": `${origin}/#organization` },
      },
    ],
  };
}

/** The row shape `serviceMeta` needs — a loose subset of `services`. */
export interface ShareableService {
  id: string;
  slug?: string | null;
  title: string;
  description?: string | null;
  cover_image_url?: string | null;
  price?: number | null;
  discounted_price?: number | null;
  currency?: string | null;
  is_free?: boolean | null;
  max_seats?: number | null;
  service_type?: string | null;
  enable_subscription?: boolean | null;
  subscription_price?: number | null;
  subscription_interval?: string | null;
}

/**
 * A paid offering — the closest thing the platform has to a product page, and
 * the link coaches actually paste into WhatsApp. Modelled as schema.org
 * `Product` + `Offer` so it renders as a priced result the same way a retail
 * listing does, with the coach's own cover art as the preview image.
 */
export function serviceMeta(
  service: ShareableService,
  origin: string,
  extras: { coachName?: string | null; brandName?: string | null } = {},
): PageMeta {
  const path = `/checkout/${service.slug || service.id}`;
  const canonical = canonicalUrl(origin, path);
  const siteName = extras.brandName?.trim() || BRAND.name;

  const free = Boolean(service.is_free) || (service.price ?? 0) <= 0;
  const listPrice = service.price ?? 0;
  const payable = service.discounted_price ?? listPrice;
  const currency = service.currency || "INR";
  const priceLabel = free ? "Free" : formatMoney(payable, currency);

  const seller = extras.coachName?.trim();
  const summary = plainText(service.description);
  // The price leads the description because that is the line WhatsApp shows
  // under the title, and it is what a buyer decides on.
  const descriptionParts = [
    summary || `${service.title}${seller ? ` by ${seller}` : ""}.`,
    free ? "Free access." : `${priceLabel}.`,
  ];
  if (service.enable_subscription && service.subscription_price && service.subscription_interval) {
    descriptionParts.push(
      `Or ${formatMoney(service.subscription_price, currency)} / ${service.subscription_interval}.`,
    );
  }

  const cover = absoluteUrl(service.cover_image_url, origin);
  const image: ShareImage = cover
    ? { url: cover, alt: service.title, mime: imageMime(cover) }
    : defaultImage(origin, service.title);

  const offer: Offer = {
    price: free ? 0 : payable,
    currency,
    availability: service.max_seats === 0 ? "SoldOut" : "InStock",
  };

  const labels: { label: string; data: string }[] = [{ label: "Price", data: priceLabel }];
  if (seller) labels.push({ label: "By", data: seller });

  return {
    title: pageTitle(service.title),
    description: truncate(descriptionParts.join(" "), MAX_DESCRIPTION),
    canonical,
    image,
    type: "product",
    siteName,
    robots: "index, follow",
    offer,
    labels,
    jsonLd: [
      organizationLd(origin),
      {
        "@type": "Product",
        "@id": `${canonical}#product`,
        name: service.title,
        description: truncate(summary || service.title, 500),
        image: [image.url],
        sku: service.id,
        category: service.service_type || undefined,
        brand: { "@type": "Brand", name: siteName },
        offers: {
          "@type": "Offer",
          url: canonical,
          // schema.org wants a plain decimal string, no separators or symbol.
          price: offer.price.toFixed(2),
          priceCurrency: offer.currency,
          availability: `https://schema.org/${offer.availability}`,
          seller: seller ? { "@type": "Person", name: seller } : { "@id": `${origin}/#organization` },
        },
      },
      breadcrumbLd(origin, [
        { name: siteName, path: "/" },
        { name: service.title, path },
      ]),
    ],
  };
}

/** The row shape `courseMeta` needs — a loose subset of `courses`. */
export interface ShareableCourse {
  id: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  cover_image_url?: string | null;
  category?: string | null;
  price?: number | null;
}

/**
 * A course. Published courses are shared constantly inside communities, so the
 * link is worth a real card even though the page itself needs a login.
 */
export function courseMeta(
  course: ShareableCourse,
  origin: string,
  extras: { coachName?: string | null; brandName?: string | null } = {},
): PageMeta {
  const path = `/course-player/${course.id}`;
  const canonical = canonicalUrl(origin, path);
  const siteName = extras.brandName?.trim() || BRAND.name;
  const teacher = extras.coachName?.trim();
  const summary = plainText(course.description);

  const art = absoluteUrl(course.cover_image_url || course.thumbnail_url, origin);
  const image: ShareImage = art
    ? { url: art, alt: course.title, mime: imageMime(art) }
    : defaultImage(origin, course.title);

  return {
    title: pageTitle(course.title),
    description: truncate(
      summary || `${course.title}${teacher ? ` — a course by ${teacher}` : ""} on ${siteName}.`,
      MAX_DESCRIPTION,
    ),
    canonical,
    image,
    type: "article",
    siteName,
    // The course page itself is gated, so there is nothing for a search engine
    // to index — but the card still has to render when the link is pasted.
    robots: "noindex, follow",
    labels: teacher ? [{ label: "Course by", data: teacher }] : undefined,
    jsonLd: [
      organizationLd(origin),
      {
        "@type": "Course",
        "@id": `${canonical}#course`,
        name: course.title,
        description: truncate(summary || course.title, 500),
        image: [image.url],
        about: course.category || undefined,
        provider: { "@type": "Organization", name: siteName, "@id": `${origin}/#organization` },
        ...(teacher ? { author: { "@type": "Person", name: teacher } } : {}),
      },
    ],
  };
}

/** The row shape `workshopMeta` needs — a loose subset of `landing_pages`. */
export interface ShareableLandingPage {
  slug: string;
  coach_name?: string | null;
  skill?: string | null;
  core_outcome?: string | null;
  thumbnail_url?: string | null;
  mentor_image_url?: string | null;
  workshop_date?: string | null;
  workshop_time?: string | null;
  generated_content?: { title?: string; subtitle?: string } | null;
}

/**
 * A public workshop landing page. Free, dated and time-boxed, so it is modelled
 * as a schema.org `Event` — that is what puts a date on the Google result and
 * what LinkedIn reads to badge the card.
 */
export function workshopMeta(page: ShareableLandingPage, origin: string): PageMeta {
  const path = `/workshop/${page.slug}`;
  const canonical = canonicalUrl(origin, path);
  const generated = page.generated_content || {};
  const title = generated.title?.trim() || page.skill?.trim() || "Live workshop";
  const host = page.coach_name?.trim();

  const dateLabel = formatWorkshopDate(page.workshop_date, page.workshop_time);
  const summary =
    plainText(generated.subtitle) || plainText(page.core_outcome) || `A free live workshop${host ? ` with ${host}` : ""}.`;

  const art = absoluteUrl(page.thumbnail_url || page.mentor_image_url, origin);
  const image: ShareImage = art
    ? { url: art, alt: title, mime: imageMime(art) }
    : defaultImage(origin, title);

  const labels: { label: string; data: string }[] = [];
  if (dateLabel) labels.push({ label: "When", data: dateLabel });
  if (host) labels.push({ label: "Host", data: host });

  const startDate = isoStart(page.workshop_date, page.workshop_time);

  return {
    title: pageTitle(title),
    description: truncate(
      [summary, dateLabel ? `Live on ${dateLabel}.` : "", "Free to join."]
        .filter(Boolean)
        .join(" "),
      MAX_DESCRIPTION,
    ),
    canonical,
    image,
    type: "website",
    siteName: BRAND.name,
    robots: "index, follow",
    labels: labels.length ? labels : undefined,
    jsonLd: [
      organizationLd(origin),
      {
        "@type": "Event",
        "@id": `${canonical}#event`,
        name: title,
        description: truncate(summary, 500),
        image: [image.url],
        eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
        eventStatus: "https://schema.org/EventScheduled",
        ...(startDate ? { startDate } : {}),
        location: { "@type": "VirtualLocation", url: canonical },
        ...(host ? { performer: { "@type": "Person", name: host } } : {}),
        organizer: { "@id": `${origin}/#organization` },
        offers: {
          "@type": "Offer",
          url: canonical,
          price: "0",
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
        },
      },
    ],
  };
}

/** "12 March 2026, 6:00 PM" — omitted entirely when the date is unusable. */
export function formatWorkshopDate(
  date: string | null | undefined,
  time: string | null | undefined,
): string {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  const day = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
  return time ? `${day}, ${time}` : day;
}

/** schema.org wants ISO 8601; a missing or unparseable date drops the field. */
function isoStart(date: string | null | undefined, time: string | null | undefined): string | undefined {
  if (!date) return undefined;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const day = parsed.toISOString().slice(0, 10);
  const match = /^(\d{1,2}):(\d{2})\s*(am|pm)?/i.exec((time || "").trim());
  if (!match) return day;
  let hour = Number(match[1]);
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (hour > 23) return day;
  return `${day}T${String(hour).padStart(2, "0")}:${match[2]}:00`;
}

/* ------------------------------------------------------------------ *
 * Rendering
 * ------------------------------------------------------------------ */

export type MetaTag =
  | { kind: "meta"; attr: "name" | "property"; key: string; value: string }
  | { kind: "link"; rel: string; href: string }
  | { kind: "jsonld"; json: string };

const FB_AVAILABILITY: Record<Availability, string> = {
  InStock: "in stock",
  SoldOut: "out of stock",
  PreOrder: "preorder",
};

/**
 * The complete tag set for a page, in one ordered list. Both renderers below
 * consume this, which is what guarantees the edge-rendered HTML and the
 * browser-updated DOM stay identical.
 */
export function metaTags(meta: PageMeta): MetaTag[] {
  const title = truncate(meta.title, MAX_TITLE);
  const description = truncate(meta.description, MAX_DESCRIPTION);
  const tags: MetaTag[] = [
    { kind: "meta", attr: "name", key: "description", value: description },
    { kind: "meta", attr: "name", key: "robots", value: meta.robots },
    { kind: "link", rel: "canonical", href: meta.canonical },

    { kind: "meta", attr: "property", key: "og:site_name", value: meta.siteName },
    { kind: "meta", attr: "property", key: "og:type", value: meta.type },
    { kind: "meta", attr: "property", key: "og:title", value: title },
    { kind: "meta", attr: "property", key: "og:description", value: description },
    { kind: "meta", attr: "property", key: "og:url", value: meta.canonical },
    { kind: "meta", attr: "property", key: "og:locale", value: "en_US" },
    { kind: "meta", attr: "property", key: "og:image", value: meta.image.url },
    // WhatsApp and iMessage look for the secure_url variant specifically.
    { kind: "meta", attr: "property", key: "og:image:secure_url", value: meta.image.url },
    { kind: "meta", attr: "property", key: "og:image:alt", value: meta.image.alt },
  ];

  if (meta.image.mime) {
    tags.push({ kind: "meta", attr: "property", key: "og:image:type", value: meta.image.mime });
  }
  // Only declared for images we generated ourselves. Lying about the size of a
  // coach-uploaded cover makes Facebook reserve the wrong box and letterbox it.
  if (meta.image.width && meta.image.height) {
    tags.push(
      { kind: "meta", attr: "property", key: "og:image:width", value: String(meta.image.width) },
      { kind: "meta", attr: "property", key: "og:image:height", value: String(meta.image.height) },
    );
  }

  if (meta.offer) {
    tags.push(
      {
        kind: "meta",
        attr: "property",
        key: "product:price:amount",
        value: meta.offer.price.toFixed(2),
      },
      {
        kind: "meta",
        attr: "property",
        key: "product:price:currency",
        value: meta.offer.currency,
      },
      {
        kind: "meta",
        attr: "property",
        key: "product:availability",
        value: FB_AVAILABILITY[meta.offer.availability],
      },
    );
  }

  tags.push(
    // summary_large_image is what turns an X post into the full-bleed card.
    { kind: "meta", attr: "name", key: "twitter:card", value: "summary_large_image" },
    { kind: "meta", attr: "name", key: "twitter:title", value: title },
    { kind: "meta", attr: "name", key: "twitter:description", value: description },
    { kind: "meta", attr: "name", key: "twitter:image", value: meta.image.url },
    { kind: "meta", attr: "name", key: "twitter:image:alt", value: meta.image.alt },
  );

  if (BRAND.social.x) {
    tags.push({ kind: "meta", attr: "name", key: "twitter:site", value: `@${BRAND.social.x}` });
  }

  meta.labels?.slice(0, 2).forEach((entry, index) => {
    tags.push(
      { kind: "meta", attr: "name", key: `twitter:label${index + 1}`, value: entry.label },
      { kind: "meta", attr: "name", key: `twitter:data${index + 1}`, value: entry.data },
    );
  });

  if (meta.jsonLd.length) {
    tags.push({
      kind: "jsonld",
      json: JSON.stringify({ "@context": "https://schema.org", "@graph": meta.jsonLd }),
    });
  }

  return tags;
}

/** Matches every tag `metaTags` emits, so old ones can be cleared first. */
export const MANAGED_META_KEYS =
  /^(description|robots|og:|twitter:|product:|article:|fb:)/i;

/** Server-side rendering: an HTML fragment for injection into `<head>`. */
export function renderMetaTags(meta: PageMeta): string {
  return metaTags(meta)
    .map((tag) => {
      if (tag.kind === "meta") {
        return `<meta ${tag.attr}="${escapeHtml(tag.key)}" content="${escapeHtml(tag.value)}">`;
      }
      if (tag.kind === "link") {
        return `<link rel="${escapeHtml(tag.rel)}" href="${escapeHtml(tag.href)}">`;
      }
      return `<script type="application/ld+json">${escapeJsonLd(tag.json)}</script>`;
    })
    .join("\n    ");
}
