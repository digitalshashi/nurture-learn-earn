import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { UniversalSearchDialog } from "@/components/search/UniversalSearchDialog";

interface SearchContextValue {
  open: boolean;
  openSearch: () => void;
  closeSearch: () => void;
}

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

/**
 * Owns the universal search palette so every entry point — the top bar button,
 * the sidebar row, the keyboard shortcut — drives the same dialog instead of
 * each mounting its own.
 */
export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openSearch = useCallback(() => setOpen(true), []);
  const closeSearch = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      setOpen((prev) => !prev);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(() => ({ open, openSearch, closeSearch }), [open, openSearch, closeSearch]);

  return (
    <SearchContext.Provider value={value}>
      {children}
      <UniversalSearchDialog open={open} onOpenChange={setOpen} />
    </SearchContext.Provider>
  );
}

/**
 * Falls back to a no-op outside the provider so a component that renders both
 * inside and outside the app shell does not have to guard the call.
 */
export function useSearch(): SearchContextValue {
  return (
    useContext(SearchContext) ?? {
      open: false,
      openSearch: () => {},
      closeSearch: () => {},
    }
  );
}
