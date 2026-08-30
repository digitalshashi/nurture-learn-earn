import { useEffect } from "react";
import { metaTags, type PageMeta } from "@/lib/seo";

/**
 * Applies a page's metadata to the live document.
 *
 * The Cloudflare Worker in `worker/` already writes these tags into the HTML
 * for crawlers, which never run this code. This hook covers the two audiences
 * the edge cannot: the browser tab (and its history entry, and what a
 * "add to home screen" shortcut is named), and crawlers that *do* render —
 * Googlebot most of all. Both read the same `metaTags()` list, so the version a
 * WhatsApp preview shows and the version Google indexes cannot disagree.
 *
 * Pass `null` while the entity is still loading; the previous route's defaults
 * stay up until there is something truer to say.
 */
export function useSeo(meta: PageMeta | null | undefined): void {
  // Callers build the meta object inline on every render, so identity is
  // useless as a dependency — the serialised value is what actually changed.
  const fingerprint = meta ? JSON.stringify(meta) : null;

  useEffect(() => {
    if (!fingerprint) return;
    applyMeta(JSON.parse(fingerprint) as PageMeta);
  }, [fingerprint]);
}

const MARKER = "data-seo";

/**
 * Rewrites the managed part of `<head>` in place.
 *
 * Anything this hook wrote before is removed, and so is the build-time default
 * for each key it is about to set — a second `og:image` would otherwise leave
 * the crawler to choose between the shell's default and the real one.
 */
export function applyMeta(meta: PageMeta, doc: Document = document): void {
  doc.title = meta.title;

  doc.head.querySelectorAll(`[${MARKER}]`).forEach((node) => node.remove());

  for (const tag of metaTags(meta)) {
    if (tag.kind === "meta") {
      doc.head
        .querySelectorAll(`meta[${tag.attr}="${tag.key}"]`)
        .forEach((node) => node.remove());
      const element = doc.createElement("meta");
      element.setAttribute(tag.attr, tag.key);
      element.setAttribute("content", tag.value);
      element.setAttribute(MARKER, "managed");
      doc.head.appendChild(element);
      continue;
    }

    if (tag.kind === "link") {
      doc.head
        .querySelectorAll(`link[rel="${tag.rel}"]`)
        .forEach((node) => node.remove());
      const element = doc.createElement("link");
      element.setAttribute("rel", tag.rel);
      element.setAttribute("href", tag.href);
      element.setAttribute(MARKER, "managed");
      doc.head.appendChild(element);
      continue;
    }

    doc.head
      .querySelectorAll('script[type="application/ld+json"]')
      .forEach((node) => node.remove());
    const script = doc.createElement("script");
    script.type = "application/ld+json";
    // textContent, never innerHTML: the browser stores the string as-is
    // instead of parsing it, so a stray `</script>` in a title cannot end the
    // block early.
    script.textContent = tag.json;
    script.setAttribute(MARKER, "managed");
    doc.head.appendChild(script);
  }
}
