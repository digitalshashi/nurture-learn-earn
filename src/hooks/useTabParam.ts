import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Keeps a page's active tab in the URL as `?tab=…`.
 *
 * Tab state used to live in component state, so every section of a page shared
 * one address: a link could only ever point at the first tab, a refresh threw
 * you back to it, and analytics saw one URL no matter which section someone was
 * actually looking at.
 *
 * The value is validated against the tab list, so a stale bookmark or a
 * hand-edited query cannot render an empty page — an unknown value falls back
 * to the default.
 *
 * @param tabs      allowed values, in order; the first is the default
 * @param param     query key, for pages that read more naturally as `?view=`
 * @param fallback  overrides the default when it is not the first tab
 */
export function useTabParam<T extends string>(
  tabs: readonly T[],
  { param = "tab", fallback }: { param?: string; fallback?: T } = {},
): [T, (next: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const defaultTab = fallback ?? tabs[0];
  const requested = searchParams.get(param);
  const active = tabs.includes(requested as T) ? (requested as T) : defaultTab;

  const setTab = useCallback(
    (next: string) => {
      // Merge rather than replace: pages carry other params (?redirect=,
      // ?service_id=, filters) that must survive a tab change.
      const params = new URLSearchParams(searchParams);

      if (next === defaultTab) {
        // Keep the default tab's URL clean so the canonical address of a page
        // stays the bare path.
        params.delete(param);
      } else {
        params.set(param, next);
      }

      // replace: switching tabs shouldn't fill the back button with history.
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams, param, defaultTab],
  );

  return [active, setTab];
}
