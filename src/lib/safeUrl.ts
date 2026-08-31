/**
 * Guards `href`/`src` values that originate from user input.
 *
 * Attachment and embed URLs are stored per-row and rendered straight into an
 * anchor. A row written with `javascript:...` (or `data:text/html,...`) would
 * then run script in the viewer's session on click — stored XSS, no
 * dangerouslySetInnerHTML required. Anything outside the allowed schemes is
 * dropped rather than rendered.
 */
const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

/**
 * Adds a `https://` scheme to user-typed URLs that are missing one (e.g.
 * "instagram.com/user"). Without this, an anchor rendered with the raw
 * value is treated by the browser as a path relative to the current page —
 * clicking it navigates inside the SPA instead of out to the real site,
 * which surfaces as this app's own 404 page instead of an external link.
 */
export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  return `https://${trimmed}`;
}

export function safeUrl(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;

  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  // Protocol-relative and root-relative URLs carry no scheme of their own and
  // inherit the page's, so they are safe to pass through.
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;

  try {
    const parsed = new URL(trimmed, window.location.origin);
    return ALLOWED_PROTOCOLS.has(parsed.protocol) ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}
