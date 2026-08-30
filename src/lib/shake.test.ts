import { describe, it, expect, vi, afterEach } from "vitest";
import { shakeElement, prefersReducedMotion } from "./shake";

/** An element that records whether it was asked to animate. */
function fakeElement(withAnimate = true) {
  const animate = vi.fn();
  const el = { ...(withAnimate ? { animate } : {}) } as unknown as HTMLElement;
  return { el, animate };
}

/** jsdom has no matchMedia, so every test states the preference it assumes. */
function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe("shakeElement", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("does nothing without an element", () => {
    stubReducedMotion(false);
    expect(() => shakeElement(null)).not.toThrow();
    expect(() => shakeElement(undefined)).not.toThrow();
  });

  it("does nothing where the Web Animations API is missing", () => {
    stubReducedMotion(false);
    const { el } = fakeElement(false);
    expect(() => shakeElement(el)).not.toThrow();
  });

  it("shakes an ordinary element", () => {
    stubReducedMotion(false);
    const { el, animate } = fakeElement();
    shakeElement(el);

    expect(animate).toHaveBeenCalledTimes(1);
    const [frames, options] = animate.mock.calls[0];
    // Starts and ends at rest, so it leaves no residual offset.
    expect(frames[0]).toEqual({ transform: "translateX(0)" });
    expect(frames[frames.length - 1]).toEqual({ transform: "translateX(0)" });
    expect(options.duration).toBeLessThanOrEqual(500);
  });

  it("stays still for someone who asked for less motion", () => {
    stubReducedMotion(true);
    const { el, animate } = fakeElement();
    shakeElement(el);
    expect(animate).not.toHaveBeenCalled();
    expect(prefersReducedMotion()).toBe(true);
  });

  it("survives an element whose animate throws", () => {
    stubReducedMotion(false);
    const el = { animate: () => { throw new Error("nope"); } } as unknown as HTMLElement;
    expect(() => shakeElement(el)).not.toThrow();
  });

  it("restarts rather than being a no-op on a repeat failure", () => {
    // The reason this uses the Web Animations API instead of a CSS class:
    // a class already on the element will not replay.
    stubReducedMotion(false);
    const { el, animate } = fakeElement();
    shakeElement(el);
    shakeElement(el);
    expect(animate).toHaveBeenCalledTimes(2);
  });
});
