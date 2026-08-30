/**
 * The small markup language behind formatted descriptions.
 *
 * Coaches wanted bold, italics, lists and real paragraphs in a service
 * description. The obvious way to get that is to store HTML from a
 * contenteditable box and paint it back with `dangerouslySetInnerHTML` — but
 * a description is written by one tenant and read by the public on a checkout
 * page, so that route hands every coach a stored-XSS primitive against their
 * own buyers. This repo has a test asserting no authored markup is ever
 * injected into the app document (see pageBuilder.test.ts), and that rule is
 * worth keeping.
 *
 * So the stored value is text in a deliberately tiny syntax, parsed here into
 * a typed tree and rendered as real React elements. There is no HTML to
 * escape because there is never any HTML: an author who types `<script>` gets
 * the characters `<script>` on screen, because the renderer only ever emits
 * the node types below.
 *
 * Supported, and nothing else:
 *
 *   **bold**            *italic*            [label](https://example.com)
 *   - bullet item       1. numbered item
 *   blank line = new paragraph, single newline = line break
 *
 * Anything unbalanced (`a * b`) is left alone and shown literally, which is
 * what someone typing prose expects.
 */

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "bold"; children: InlineNode[] }
  | { type: "italic"; children: InlineNode[] }
  | { type: "link"; href: string; children: InlineNode[] }
  | { type: "break" };

export type BlockNode =
  | { type: "paragraph"; children: InlineNode[] }
  | { type: "bullets"; items: InlineNode[][] }
  | { type: "numbers"; items: InlineNode[][] };

const BULLET = /^\s{0,3}[-•]\s+(.*)$/;
const NUMBERED = /^\s{0,3}\d+[.)]\s+(.*)$/;
const LINK = /^\[([^\]\n]*)\]\(([^)\s]*)\)/;

/**
 * Finds the emphasis marker that closes the one opened at `from`.
 *
 * The two guards are what stop prose from being eaten: a marker with
 * whitespace against its inner edge does not close a span, so "2 * 3 * 4"
 * stays arithmetic rather than becoming italics.
 *
 * @returns the index of the closing marker, or -1 if the span never closes.
 */
function findClosingMarker(text: string, from: number, marker: string): number {
  if (from >= text.length || /\s/.test(text[from])) return -1;

  let cursor = from;
  while (cursor < text.length) {
    const at = text.indexOf(marker, cursor);
    if (at === -1) return -1;

    // A "**" is a different marker from a "*", so an italic span scans past
    // any bold delimiters nested inside it.
    if (marker === "*" && text[at + 1] === "*") {
      cursor = at + 2;
      continue;
    }
    if (at === from || /\s/.test(text[at - 1])) {
      cursor = at + marker.length;
      continue;
    }
    return at;
  }
  return -1;
}

/** Parses the inline span of one block: emphasis, links and soft line breaks. */
export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let buffer = "";
  let i = 0;

  const flush = () => {
    if (buffer) {
      nodes.push({ type: "text", value: buffer });
      buffer = "";
    }
  };

  while (i < text.length) {
    const char = text[i];

    if (char === "\n") {
      flush();
      nodes.push({ type: "break" });
      i += 1;
      continue;
    }

    if (char === "*") {
      // Longest marker first, and fall back through the shorter ones: "***x**"
      // is not bold-italic, but the "**" inside it still opens a bold span.
      const candidates = text.startsWith("***", i)
        ? (["***", "**", "*"] as const)
        : text.startsWith("**", i)
          ? (["**", "*"] as const)
          : (["*"] as const);

      let matched = false;
      for (const marker of candidates) {
        const close = findClosingMarker(text, i + marker.length, marker);
        if (close === -1) continue;

        const inner = text.slice(i + marker.length, close);
        // A span has to emphasise something. Without this, a lone "****"
        // becomes italics wrapped around two more asterisks.
        if (!inner.replace(/\*/g, "").trim()) continue;

        flush();
        const children = parseInline(inner);
        nodes.push(
          marker === "***"
            ? { type: "bold", children: [{ type: "italic", children }] }
            : marker === "**"
              ? { type: "bold", children }
              : { type: "italic", children },
        );
        i = close + marker.length;
        matched = true;
        break;
      }
      if (matched) continue;
    }

    if (char === "[") {
      const match = LINK.exec(text.slice(i));
      if (match && match[2]) {
        flush();
        // A label cannot contain "]", so it can never hold another link — a
        // link inside a link is unrepresentable rather than guarded against.
        nodes.push({ type: "link", href: match[2], children: parseInline(match[1]) });
        i += match[0].length;
        continue;
      }
    }

    buffer += char;
    i += 1;
  }

  flush();
  return nodes;
}

/** Parses a whole description into blocks. */
export function parseRichText(source: string | null | undefined): BlockNode[] {
  if (!source || !source.trim()) return [];

  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: BlockNode[] = [];

  // Runs of like lines accumulate here until something different ends them.
  let paragraph: string[] = [];
  let items: string[] = [];
  let itemsKind: "bullets" | "numbers" | null = null;

  const closeParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ type: "paragraph", children: parseInline(paragraph.join("\n")) });
    paragraph = [];
  };

  const closeList = () => {
    if (!itemsKind || items.length === 0) {
      itemsKind = null;
      items = [];
      return;
    }
    blocks.push({ type: itemsKind, items: items.map((item) => parseInline(item)) });
    itemsKind = null;
    items = [];
  };

  for (const line of lines) {
    const bullet = BULLET.exec(line);
    const numbered = bullet ? null : NUMBERED.exec(line);

    if (bullet || numbered) {
      const kind = bullet ? "bullets" : "numbers";
      closeParagraph();
      // Switching between bullets and numbers starts a new list rather than
      // producing one list that changes shape halfway down.
      if (itemsKind && itemsKind !== kind) closeList();
      itemsKind = kind;
      items.push((bullet ? bullet[1] : numbered![1]).trim());
      continue;
    }

    if (!line.trim()) {
      closeParagraph();
      closeList();
      continue;
    }

    closeList();
    paragraph.push(line);
  }

  closeParagraph();
  closeList();
  return blocks;
}

/**
 * The same text with the markup taken off — for meta descriptions, card
 * previews and anywhere else a single unformatted line is what is wanted.
 */
export function richTextToPlain(source: string | null | undefined): string {
  const walk = (nodes: InlineNode[]): string =>
    nodes
      .map((node) => {
        switch (node.type) {
          case "text":
            return node.value;
          case "break":
            return " ";
          default:
            return walk(node.children);
        }
      })
      .join("");

  return parseRichText(source)
    .map((block) =>
      block.type === "paragraph" ? walk(block.children) : block.items.map(walk).join(" "),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when the value uses any formatting, i.e. re-rendering it as plain text would lose something. */
export function hasFormatting(source: string | null | undefined): boolean {
  const blocks = parseRichText(source);
  if (blocks.some((b) => b.type !== "paragraph")) return true;
  const inlineIsFormatted = (nodes: InlineNode[]): boolean =>
    nodes.some((n) => n.type === "bold" || n.type === "italic" || n.type === "link");
  return blocks.some((b) => b.type === "paragraph" && inlineIsFormatted(b.children));
}
