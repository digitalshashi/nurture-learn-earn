import { useEffect, useRef } from "react";

/**
 * Grows a textarea to fit what is in it, up to a limit, then scrolls inside.
 *
 * A prompt has no length limit anywhere — the column is text, the edge
 * function does not truncate — but a fixed six-row box turns a paragraph-long
 * brief into a keyhole, and a suggestion dropped into it is longer still. This
 * makes the box match the writing rather than the other way round.
 */
export function useAutoGrow(value: string, maxHeight = 420) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Collapse first: scrollHeight only shrinks if the box is not already
    // holding itself open at the old height.
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value, maxHeight]);

  return ref;
}
