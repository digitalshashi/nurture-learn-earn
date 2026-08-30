/**
 * A short horizontal shake, for a field that just refused to go through.
 *
 * Driven by the Web Animations API rather than a CSS class. A class has to be
 * removed and re-added across a frame to replay, which means a second failed
 * attempt on the same field either does nothing or needs a nonce threaded
 * through the render. Calling animate() again simply restarts it.
 */

/** Damped, so it settles rather than stopping dead. */
const KEYFRAMES: Keyframe[] = [
  { transform: "translateX(0)" },
  { transform: "translateX(-6px)" },
  { transform: "translateX(5px)" },
  { transform: "translateX(-3px)" },
  { transform: "translateX(2px)" },
  { transform: "translateX(0)" },
];

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Shakes one element. Silent where it cannot or should not run: the colour,
 * the message and the focus all still say the same thing without it.
 */
export function shakeElement(el: HTMLElement | null | undefined): void {
  if (!el || typeof el.animate !== "function") return;
  // Someone who has asked for less motion has asked for this too.
  if (prefersReducedMotion()) return;

  try {
    el.animate(KEYFRAMES, {
      duration: 380,
      // The easing curve used for iOS-style shakes: quick out, slow settle.
      easing: "cubic-bezier(.36,.07,.19,.97)",
    });
  } catch {
    // Nothing here is load-bearing.
  }
}
