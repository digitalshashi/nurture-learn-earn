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
