import { useLocation } from "react-router-dom";
import { useSeo } from "@/hooks/useSeo";
import { siteMeta } from "@/lib/seo";

/**
 * Resets the document head to the 1corehub defaults on every navigation.
 *
 * Without it, a single-page app keeps whatever the last page wrote: leave a
 * service checkout for the feed and the tab still reads "Sales Mastery ·
 * 1corehub", and so does the entry saved to browser history.
 *
 * Rendered above `<Routes>` so its effect runs before the matched page's own
 * `useSeo`, which then overrides it. Pages with nothing specific to say simply
 * keep these defaults.
 */
export function SeoDefaults() {
  const { pathname } = useLocation();
  useSeo(siteMeta(window.location.origin, pathname));
  return null;
}
