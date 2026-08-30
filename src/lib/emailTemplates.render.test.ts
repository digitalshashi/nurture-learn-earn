import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ALL_TEMPLATES, extractEditable } from "./emailTemplates";

/**
 * Renders every template the way the server does and checks the result is a
 * sound, complete document. Markup that only looks right in a string is not
 * evidence it survives a parser.
 */

// The same sample values the editor previews with.
const editorSource = readFileSync("src/components/email/EmailTemplateEditor.tsx", "utf8");
const samplesBlock = editorSource.slice(
  editorSource.indexOf("const DEFAULT_SAMPLES"),
  editorSource.indexOf("export function renderPreview"),
);
const SAMPLES: Record<string, string> = Object.fromEntries(
  [...samplesBlock.matchAll(/^\s{2}([a-z_]+):\s*(?:"([^"]*)"|String\([^)]*\))/gm)].map((m) => [
    m[1],
    m[2] ?? "2026",
  ]),
);

/** Mirrors renderTemplate in supabase/functions/_shared/email.ts. */
const render = (body: string, vars: Record<string, string>) =>
  body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (whole, key: string) =>
    vars[key] === undefined
      ? whole
      : vars[key].replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"),
  );

describe.each(ALL_TEMPLATES.map((t) => [t.key, t] as const))("%s renders", (key, t) => {
  const html = render(t.defaultBody, SAMPLES);
  const subject = render(t.defaultSubject, SAMPLES);
  const doc = new DOMParser().parseFromString(html, "text/html");

  it("leaves no unfilled placeholder", () => {
    // A stray {{token}} reaching an inbox is the most visible failure there is.
    expect(html.match(/\{\{[^}]+\}\}/g), `${key} body`).toBeNull();
    expect(subject.match(/\{\{[^}]+\}\}/g), `${key} subject`).toBeNull();
  });

  it("parses into a document with a single body", () => {
    expect(doc.querySelectorAll("body")).toHaveLength(1);
    expect(doc.querySelector("parsererror")).toBeNull();
  });

  it("keeps the shell intact after parsing", () => {
    // If the tables were malformed, the parser would drop or re-nest them.
    expect(doc.querySelectorAll("table").length).toBeGreaterThanOrEqual(3);
    expect(doc.querySelector("h1")?.textContent?.trim()).toBeTruthy();
  });

  it("carries a non-empty subject and preheader", () => {
    expect(subject.trim().length).toBeGreaterThan(3);
    const preheader = doc.body.querySelector("div[style*='display:none']");
    expect(preheader?.textContent?.trim()).toBeTruthy();
  });

  it("points every link at a real destination", () => {
    for (const a of Array.from(doc.querySelectorAll("a"))) {
      const href = a.getAttribute("href") || "";
      expect(href, `${key} has an empty href`).not.toBe("");
      // Nothing script-bearing, and no unresolved placeholder in a URL.
      expect(href, `${key} href: ${href}`).toMatch(/^(https?:|mailto:)/i);
      expect(a.textContent?.trim(), `${key} link text`).toBeTruthy();
    }
  });

  it("opens external links safely", () => {
    for (const a of Array.from(doc.querySelectorAll('a[target="_blank"]'))) {
      expect(a.getAttribute("rel")).toContain("noopener");
    }
  });

  it("exposes an editable region that round-trips", () => {
    const inner = extractEditable(t.defaultBody);
    expect(inner, `${key} has no editable region`).toBeTruthy();
    // The region must be real content, not an empty marker pair.
    expect(inner!.trim().length).toBeGreaterThan(50);
  });

  it("escapes values rather than injecting them raw", () => {
    const hostile = render(t.defaultBody, { ...SAMPLES, full_name: '<script>alert(1)</script>' });
    expect(hostile).not.toContain("<script>alert(1)</script>");
  });
});

describe("template set", () => {
  it("gives every template a distinct subject", () => {
    const subjects = ALL_TEMPLATES.map((t) => t.defaultSubject);
    expect(new Set(subjects).size).toBe(subjects.length);
  });

  it("keeps subjects short enough not to truncate in an inbox", () => {
    for (const t of ALL_TEMPLATES) {
      const rendered = render(t.defaultSubject, SAMPLES);
      // Most clients cut around 70 characters on desktop.
      expect(rendered.length, `${t.key}: "${rendered}"`).toBeLessThanOrEqual(78);
    }
  });
});
