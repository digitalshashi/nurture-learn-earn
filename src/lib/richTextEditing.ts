/**
 * The text surgery behind the formatting toolbar.
 *
 * Kept apart from the editor component because it is pure string work with
 * nothing React about it: every function takes the box's value and selection
 * and returns the value and selection it should have next. That makes the
 * fiddly parts — toggling formatting back off, renumbering a list, leaving
 * the caret where the author expects it — testable without a DOM.
 *
 * The format itself is defined in ./richText.ts.
 */

/** A replacement for the whole textarea value, plus where the selection lands. */
export interface Edit {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

/** Length of the unbroken run of `char` ending immediately before `index`. */
function runBefore(value: string, index: number, char: string): number {
  let n = 0;
  while (index - n - 1 >= 0 && value[index - n - 1] === char) n += 1;
  return n;
}

/** Length of the unbroken run of `char` starting at `index`. */
function runAfter(value: string, index: number, char: string): number {
  let n = 0;
  while (index + n < value.length && value[index + n] === char) n += 1;
  return n;
}

/**
 * Whether runs of this length already apply `marker` to what sits between them.
 *
 * Counting the run rather than matching the literal characters is what keeps
 * the two buttons independent: "**b**" is bold only, so Italic there has to
 * add a level rather than strip one, while "***b***" is both and Italic should
 * take its own back off. An odd run carries the italic; two or more carry the
 * bold.
 */
function encloses(beforeRun: number, afterRun: number, marker: string): boolean {
  return marker === "**"
    ? beforeRun >= 2 && afterRun >= 2
    : beforeRun % 2 === 1 && afterRun % 2 === 1;
}

/** Wraps or unwraps the selection in `marker`, so the button toggles. */
export function toggleWrap(value: string, start: number, end: number, marker: string): Edit {
  const selected = value.slice(start, end);
  const width = marker.length;

  // Already wrapped from the outside: "**|bold|**" with just the word selected.
  if (encloses(runBefore(value, start, "*"), runAfter(value, end, "*"), marker)) {
    return {
      text: value.slice(0, start - width) + selected + value.slice(end + width),
      selectionStart: start - width,
      selectionEnd: end - width,
    };
  }

  // Already wrapped from the inside: "|**bold**|" with the markers selected.
  if (
    selected.length > width * 2 &&
    encloses(runAfter(selected, 0, "*"), runBefore(selected, selected.length, "*"), marker)
  ) {
    const inner = selected.slice(width, -width);
    return {
      text: value.slice(0, start) + inner + value.slice(end),
      selectionStart: start,
      selectionEnd: start + inner.length,
    };
  }

  // Nothing selected: drop in the markers and put the caret between them, so
  // the next thing typed is the formatted word.
  if (start === end) {
    return {
      text: `${value.slice(0, start)}${marker}${marker}${value.slice(end)}`,
      selectionStart: start + width,
      selectionEnd: start + width,
    };
  }

  return {
    text: `${value.slice(0, start)}${marker}${selected}${marker}${value.slice(end)}`,
    selectionStart: start + width,
    selectionEnd: end + width,
  };
}

/**
 * Puts a list marker on every line the selection touches, or takes it off when
 * all of them already have one. Numbered lists renumber from one.
 */
export function toggleLinePrefix(value: string, start: number, end: number, ordered: boolean): Edit {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEndIndex = value.indexOf("\n", end);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;

  const lines = value.slice(lineStart, lineEnd).split("\n");
  const marker = /^\s*(?:[-•]|\d+[.)])\s+/;
  const allMarked = lines.every((line) => !line.trim() || marker.test(line));

  const next = lines
    .map((line, i) => {
      if (!line.trim()) return line;
      const bare = line.replace(marker, "");
      if (allMarked) return bare;
      return ordered ? `${i + 1}. ${bare}` : `- ${bare}`;
    })
    .join("\n");

  return {
    text: value.slice(0, lineStart) + next + value.slice(lineEnd),
    selectionStart: lineStart,
    selectionEnd: lineStart + next.length,
  };
}

/** Inserts a link and selects the part the author still has to fill in. */
export function insertLink(value: string, start: number, end: number): Edit {
  const label = value.slice(start, end) || "link text";
  const href = "https://";
  const snippet = `[${label}](${href})`;
  // With a label already selected the URL is what is missing, and vice versa.
  const target = value.slice(start, end)
    ? { from: start + label.length + 3, to: start + label.length + 3 + href.length }
    : { from: start + 1, to: start + 1 + label.length };

  return {
    text: value.slice(0, start) + snippet + value.slice(end),
    selectionStart: target.from,
    selectionEnd: target.to,
  };
}
