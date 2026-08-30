import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { useTabParam } from "./useTabParam";

const TABS = ["overview", "details", "history"] as const;

function wrapper(initial: string) {
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
  );
}

/** Reads the tab plus the live URL, so param merging can be asserted. */
const useProbe = (param?: string) => {
  const [tab, setTab] = useTabParam(TABS, param ? { param } : undefined);
  const location = useLocation();
  return { tab, setTab, search: location.search };
};

describe("useTabParam", () => {
  it("defaults to the first tab when the URL says nothing", () => {
    const { result } = renderHook(() => useProbe(), { wrapper: wrapper("/page") });
    expect(result.current.tab).toBe("overview");
  });

  it("reads the tab from the URL", () => {
    const { result } = renderHook(() => useProbe(), {
      wrapper: wrapper("/page?tab=details"),
    });
    expect(result.current.tab).toBe("details");
  });

  it("ignores a value that is not a real tab", () => {
    // A stale bookmark or hand-edited query must not render an empty page.
    const { result } = renderHook(() => useProbe(), {
      wrapper: wrapper("/page?tab=bogus"),
    });
    expect(result.current.tab).toBe("overview");
  });

  it("writes the tab into the URL", () => {
    const { result } = renderHook(() => useProbe(), { wrapper: wrapper("/page") });

    act(() => result.current.setTab("history"));

    expect(result.current.tab).toBe("history");
    expect(result.current.search).toBe("?tab=history");
  });

  it("keeps the default tab out of the URL", () => {
    const { result } = renderHook(() => useProbe(), {
      wrapper: wrapper("/page?tab=history"),
    });

    act(() => result.current.setTab("overview"));

    // The canonical address of a page stays the bare path.
    expect(result.current.search).toBe("");
    expect(result.current.tab).toBe("overview");
  });

  it("preserves other query parameters", () => {
    // Login carries ?redirect=, checkout carries ?service_id= — replacing the
    // whole query on a tab change would silently drop them.
    const { result } = renderHook(() => useProbe(), {
      wrapper: wrapper("/login?redirect=%2Fdashboard"),
    });

    act(() => result.current.setTab("details"));

    expect(result.current.search).toContain("redirect=%2Fdashboard");
    expect(result.current.search).toContain("tab=details");
  });

  it("preserves other parameters when clearing back to the default", () => {
    const { result } = renderHook(() => useProbe(), {
      wrapper: wrapper("/login?redirect=%2Fdashboard&tab=details"),
    });

    act(() => result.current.setTab("overview"));

    expect(result.current.search).toContain("redirect=%2Fdashboard");
    expect(result.current.search).not.toContain("tab=");
  });

  it("supports a custom parameter name", () => {
    const { result } = renderHook(() => useProbe("view"), {
      wrapper: wrapper("/page?view=details"),
    });

    expect(result.current.tab).toBe("details");

    act(() => result.current.setTab("history"));
    expect(result.current.search).toBe("?view=history");
  });
});
