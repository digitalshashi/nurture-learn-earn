/**
 * The one place the product's identity is spelled out.
 *
 * Anything user-visible that names the platform — page titles, the sidebar
 * mark, share cards, the PWA manifest, transactional copy — reads from here so
 * a rename is a one-line change rather than a grep-and-hope.
 *
 * Coaches can override the *storefront* name per workspace via
 * `platform_settings.brand_name`; these constants are the platform-level
 * fallback used before that row loads and wherever no workspace is in scope.
 */
export const BRAND = {
  /** Wordmark. Lower-case on purpose — it is styled, not sentence-cased. */
  name: "1corehub",
  /** Used where a name has to start a sentence. */
  displayName: "1corehub",
  shortName: "1corehub",
  tagline: "One hub for your whole business",
  description:
    "Courses, community, events, CRM and payments — everything you sell, in one place.",
  /** Legal entity shown in JSON-LD and footers. */
  legalName: "1corehub",
  /** Brand palette, mirrored from the CSS custom properties in index.css. */
  colors: {
    accent: "#fa4f38",
    ink: "#111116",
    paper: "#ffffff",
  },
  /** Social handles, without the @. Empty string means "not on that network". */
  social: {
    x: "",
    instagram: "",
  },
  assets: {
    logo: "/logo.svg",
    icon: "/icon-source.svg",
    /** 1200x630 fallback share card. Must stay in sync with the sizes below. */
    ogImage: "/og-default.png",
    ogImageWidth: 1200,
    ogImageHeight: 630,
  },
} as const;

/** `<title>` for a page. Home gets the tagline; everything else is suffixed. */
export function pageTitle(pageName?: string | null): string {
  const trimmed = pageName?.trim();
  if (!trimmed) return `${BRAND.name} — ${BRAND.tagline}`;
  if (trimmed.toLowerCase() === BRAND.name.toLowerCase()) return trimmed;
  return `${trimmed} · ${BRAND.name}`;
}
