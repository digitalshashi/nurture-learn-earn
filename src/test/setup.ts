import "@testing-library/jest-dom";

// jsdom ships no ResizeObserver, and recharts' ResponsiveContainer constructs
// one on mount — without this, any component rendering a chart throws.
if (!("ResizeObserver" in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom 20 predates AbortSignal.timeout. The Cloudflare Worker uses it to cap
// how long a share preview waits on Supabase; without this shim the call throws
// before fetch is ever reached, and the worker tests would exercise only the
// error path while appearing to pass.
if (typeof (AbortSignal as unknown as { timeout?: unknown }).timeout !== "function") {
  (AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }).timeout = (ms: number) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new DOMException("TimeoutError", "TimeoutError")), ms);
    return controller.signal;
  };
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// jsdom implements no layout, so it ships no scrollIntoView. cmdk calls it on
// every selection change to keep the highlighted command in view, which throws
// on mount for any test that renders the command palette.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
