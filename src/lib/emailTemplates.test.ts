import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  ALL_TEMPLATES,
  EDITABLE_END,
  EDITABLE_START,
  extractEditable,
  isFullDocument,
  spliceEditable,
  COACH_TEMPLATES,
  SYSTEM_TEMPLATE,
  buildEmail,
  EMAIL_THEME,
} from "./emailTemplates";

describe("buildEmail", () => {
  const sample = buildEmail({
    preheader: "Preview line",
    eyebrow: "Receipt",
    heading: "Thanks",
    paragraphs: ["First para", "Second para"],
    details: {
      title: "Details",
      rows: [
        { label: "Item", value: "Course" },
        { label: "Total", value: "₹999", emphasis: true },
      ],
    },
    checklist: ["Step one", "Step two"],
    cta: { label: "Open", url: "https://example.com" },
    footnote: "Small print",
  });

  it("renders every part it was given", () => {
    for (const fragment of [
      "Preview line",
      "Receipt",
      "Thanks",
      "First para",
      "Second para",
      "Item",
      "₹999",
      "Step one",
      "Open",
      "Small print",
    ]) {
      expect(sample).toContain(fragment);
    }
  });

  it("hides the preheader from the visible body", () => {
    // It must reach the inbox preview without appearing at the top of the mail.
    expect(sample).toMatch(/display:none;max-height:0;overflow:hidden/);
  });

  it("lays out with tables, not flexbox or grid", () => {
    // Outlook renders through Word and supports neither.
    expect(sample).not.toMatch(/display:\s*flex/);
    expect(sample).not.toMatch(/display:\s*grid/);
    expect(sample).toContain('role="presentation"');
  });

  it("builds the button as a table so Outlook keeps its shape", () => {
    // A bare <a> with padding collapses in Outlook; the bgcolor cell survives.
    expect(sample).toMatch(/<td align="center" bgcolor="#f97316"/);
  });

  it("opens links safely in a new tab", () => {
    expect(sample).toContain('rel="noopener noreferrer"');
  });

  it("declares dark-mode support and a viewport", () => {
    expect(sample).toContain('name="color-scheme"');
    expect(sample).toContain('name="viewport"');
  });

  it("styles inline rather than relying on a stylesheet", () => {
    // Several clients strip <style> blocks entirely, so the inline styles have
    // to carry the design on their own.
    expect(sample).toContain("style=");
  });

  it("keeps the stylesheet to mobile overrides, so losing it changes nothing", () => {
    // A <style> block is allowed only for narrowing things on small screens.
    // Anything outside a media query would be design a stripping client loses.
    const blocks = sample.match(/<style[^>]*>([\s\S]*?)<\/style>/g) ?? [];
    for (const block of blocks) {
      const css = block.replace(/<\/?style[^>]*>/g, "").trim();
      expect(css.startsWith("@media"), "stylesheet must open with @media").toBe(true);
      // No rule may sit outside the media query.
      expect(css.replace(/@media[^{]+\{[\s\S]*\}/, "").trim()).toBe("");
    }
  });

  it("never lets a font stack break out of a style attribute", () => {
    // A double quote inside style="..." ends the attribute early: every
    // declaration after font-family is silently dropped, and some clients
    // discard the whole style. That once cost every button its colour.
    for (const t of ALL_TEMPLATES) {
      for (const attr of t.defaultBody.match(/style="[^"]*"/g) ?? []) {
        expect(attr, `${t.key} truncated style attribute`).not.toMatch(/font-family:[^"]*,\s*$/);
      }
      expect(t.defaultBody, `${t.key} font stack`).not.toMatch(/style="[^"]*font-family:[^"]*"[A-Za-z]/);
    }
  });

  it("constrains the layout to 600px", () => {
    expect(sample).toContain('width="600"');
    expect(sample).toContain("max-width:100%");
  });

  it("omits optional blocks that were not supplied", () => {
    const minimal = buildEmail({
      preheader: "x",
      heading: "y",
      paragraphs: ["z"],
    });
    expect(minimal).not.toContain('bgcolor="#f97316"'); // no CTA
    expect(minimal).not.toContain("Details");
  });
});

describe("template library", () => {
  it("defines a label, description, subject and body for each", () => {
    for (const t of ALL_TEMPLATES) {
      expect(t.key, "key").toBeTruthy();
      expect(t.label, `${t.key} label`).toBeTruthy();
      expect(t.description, `${t.key} description`).toBeTruthy();
      expect(t.defaultSubject, `${t.key} subject`).toBeTruthy();
      expect(t.defaultBody.length, `${t.key} body`).toBeGreaterThan(400);
    }
  });

  it("uses unique keys", () => {
    const keys = ALL_TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("declares every placeholder it actually uses", () => {
    // A body referencing {{foo}} that isn't in `variables` gives the coach no
    // way to know it exists, and the editor won't offer it.
    for (const t of ALL_TEMPLATES) {
      const used = new Set(
        [...`${t.defaultSubject} ${t.defaultBody}`.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map(
          (m) => m[1],
        ),
      );
      for (const name of used) {
        expect(t.variables, `${t.key} does not declare {{${name}}}`).toContain(name);
      }
    }
  });

  it("gives every template a preheader and a heading", () => {
    for (const t of ALL_TEMPLATES) {
      expect(t.defaultBody, `${t.key} preheader`).toMatch(/display:none;max-height:0/);
      expect(t.defaultBody, `${t.key} heading`).toContain("<h1");
    }
  });

  it("carries the brand name and year in the footer of each", () => {
    for (const t of ALL_TEMPLATES) {
      expect(t.defaultBody, t.key).toContain("{{academy_name}}");
      expect(t.defaultBody, t.key).toContain("{{year}}");
    }
  });

  it("gives the action-oriented templates a call to action", () => {
    const withCta = ["welcome_email", "course_enrollment", "certificate_issued", "course_reminder", "event_reminder", "password_reset"];
    for (const key of withCta) {
      const t = COACH_TEMPLATES.find((x) => x.key === key)!;
      expect(t.defaultBody, `${key} should have a button`).toContain(EMAIL_THEME.accent);
    }
  });

  it("keeps the receipt free of a call to action", () => {
    // A receipt is a record, not a prompt — there is nothing to click.
    const receipt = COACH_TEMPLATES.find((t) => t.key === "payment_receipt")!;
    expect(receipt.defaultBody).not.toMatch(/<td align="center" bgcolor/);
    expect(receipt.defaultBody).toContain("{{transaction_id}}");
  });

  it("has a preview sample for every placeholder it uses", () => {
    // renderPreview leaves unknown tokens visible, so a placeholder with no
    // sample shows a literal {{token}} in the preview and in test sends.
    const editorSource = readFileSync("src/components/email/EmailTemplateEditor.tsx", "utf8");
    const samplesBlock = editorSource.slice(
      editorSource.indexOf("const DEFAULT_SAMPLES"),
      editorSource.indexOf("export function renderPreview"),
    );

    for (const t of ALL_TEMPLATES) {
      for (const name of t.variables) {
        expect(
          samplesBlock,
          `no preview sample for {{${name}}} (used by ${t.key})`,
        ).toContain(`${name}:`);
      }
    }
  });

  it("makes the OTP code prominent and single-use", () => {
    expect(SYSTEM_TEMPLATE.defaultBody).toContain("letter-spacing:.28em");
    expect(SYSTEM_TEMPLATE.defaultBody).toContain("{{otp_code}}");
    expect(SYSTEM_TEMPLATE.defaultSubject).toContain("{{otp_code}}");
    // Security guidance belongs in the mail itself.
    expect(SYSTEM_TEMPLATE.defaultBody).toMatch(/didn't try to sign in/i);
  });
});

describe("editable region", () => {
  // contentEditable silently drops <!doctype>, <html>, <head> and <body>. Round
  // tripping a whole template through it therefore destroys the layout, so the
  // rich editor is confined to a marked inner region.
  it("marks a region in every generated template", () => {
    for (const t of ALL_TEMPLATES) {
      expect(t.defaultBody, `${t.key} start marker`).toContain(EDITABLE_START);
      expect(t.defaultBody, `${t.key} end marker`).toContain(EDITABLE_END);
    }
  });

  it("extracts only the content, never the shell", () => {
    const t = ALL_TEMPLATES[0];
    const inner = extractEditable(t.defaultBody)!;

    expect(inner).toBeTruthy();
    expect(inner).not.toContain("<!doctype");
    expect(inner).not.toContain("<body");
    // The brand bar and footer sit outside the region and must stay put.
    expect(inner).not.toContain("Sent by {{academy_name}}");
    expect(inner).toContain("<h1");
  });

  it("returns null when a template has no markers", () => {
    expect(extractEditable("<p>plain fragment</p>")).toBeNull();
  });

  it("puts an edit back without disturbing the shell", () => {
    const t = ALL_TEMPLATES[0];
    const updated = spliceEditable(t.defaultBody, "<h1>Rewritten</h1>");

    expect(updated).toContain("<h1>Rewritten</h1>");
    expect(updated.startsWith("<!doctype html")).toBe(true);
    expect(updated).toContain("Sent by {{academy_name}}");
    expect(updated).toContain("width=\"600\"");
  });

  it("survives a full edit round trip", () => {
    const t = ALL_TEMPLATES[0];
    const inner = extractEditable(t.defaultBody)!;
    const roundTripped = spliceEditable(t.defaultBody, inner);
    expect(roundTripped).toBe(t.defaultBody);
  });

  it("falls back to replacing everything for an unmarked fragment", () => {
    expect(spliceEditable("<p>old</p>", "<p>new</p>")).toBe("<p>new</p>");
  });

  it("recognises full documents versus fragments", () => {
    expect(isFullDocument(ALL_TEMPLATES[0].defaultBody)).toBe(true);
    expect(isFullDocument("<p>hi</p>")).toBe(false);
  });
});

describe("the one-time code is the thing you came for", () => {
  const otp = SYSTEM_TEMPLATE.defaultBody;

  it("gives the code its own panel, not a sentence to read past", () => {
    // It used to be a <span> inside a <p>, inheriting the paragraph's left
    // alignment and margins, which is why it read as body text.
    expect(otp).not.toMatch(/<p[^>]*>[^<]*<span[^>]*>\{\{otp_code\}\}/);
    expect(otp).toContain('class="em-code"');
    expect(otp).toMatch(/<td align="center"[^>]*class="em-code"/);
  });

  it("cancels the trailing letter-space so the digits sit centred", () => {
    // Tracking adds a gap after the last character; without compensation the
    // code sits visibly left of the middle of its own panel.
    const panel = otp.slice(otp.indexOf('class="em-code"'));
    const spacing = panel.match(/letter-spacing:\.(\d+)em/)?.[1];
    const indent = panel.match(/text-indent:\.(\d+)em/)?.[1];
    expect(spacing).toBeDefined();
    expect(indent).toBe(spacing);
  });

  it("keeps the code on one line", () => {
    // A six-digit code broken across two lines has to be reassembled by hand.
    expect(otp.slice(otp.indexOf('class="em-code"'))).toContain("white-space:nowrap");
  });

  it("puts the expiry with the code rather than three lines below it", () => {
    const codeAt = otp.indexOf("{{otp_code}}");
    const expiryAt = otp.indexOf("{{expiry_minutes}}");
    expect(expiryAt).toBeGreaterThan(codeAt);
    expect(expiryAt - codeAt).toBeLessThan(800);
  });

  it("makes the security note look like a warning, not more grey text", () => {
    const warn = otp.slice(otp.indexOf("Didn't try to sign in"));
    const panel = otp.slice(0, otp.indexOf("Didn't try to sign in"));
    expect(panel).toMatch(/border-left:3px solid/);
    expect(warn.length).toBeGreaterThan(0);
  });
});

describe("the shell has a hierarchy", () => {
  const sample = COACH_TEMPLATES[0].defaultBody;

  it("shows brand identity without an image", () => {
    // Every client that blocks images would otherwise show a nameless card.
    expect(sample).toMatch(/height:4px;line-height:4px;font-size:0;background-color:/);
    expect(sample).not.toMatch(/<img/);
  });

  it("sets the brand name below the headline in weight", () => {
    // A 17px bold brand line directly above a 24px bold headline read as two
    // competing titles.
    const brandBar = sample.slice(sample.indexOf("{{academy_name}}") - 400, sample.indexOf("{{academy_name}}"));
    expect(brandBar).toMatch(/font-size:13px/);
    expect(sample).toMatch(/class="em-h1"[^>]*font-size:24px/);
  });

  it("closes with one line rather than a wall of grey", () => {
    const footer = sample.slice(sample.indexOf("Sent by {{academy_name}}"));
    const paragraphs = footer.match(/<p /g) ?? [];
    expect(paragraphs.length).toBeLessThanOrEqual(2);
  });
});

describe("it works on a phone", () => {
  const otp = SYSTEM_TEMPLATE.defaultBody;

  it("scales the code down twice, not once", () => {
    // 34px of tracked digits overflows a 320px screen even after one step.
    expect(otp).toMatch(/@media only screen and \(max-width:620px\)/);
    expect(otp).toMatch(/@media only screen and \(max-width:360px\)/);
    const rules = otp.match(/\.em-code \{[^}]*\}/g) ?? [];
    expect(rules.length).toBe(2);
  });

  it("shrinks the tracking with the type, keeping the indent in step", () => {
    for (const rule of otp.match(/\.em-code \{[^}]*\}/g) ?? []) {
      const spacing = rule.match(/letter-spacing:\.(\d+)em/)?.[1];
      const indent = rule.match(/text-indent:\.(\d+)em/)?.[1];
      expect(indent, rule).toBe(spacing);
    }
  });

  it("keeps every mobile rule to something already styled inline", () => {
    // A client that drops <style> must still render correctly, just at
    // desktop spacing.
    expect(otp).toContain('style="width:600px;max-width:100%');
  });
});

describe("an itemised panel holds its shape", () => {
  const receipt = COACH_TEMPLATES.find((t) => t.key === "payment_receipt")!.defaultBody;
  const panel = receipt.slice(receipt.indexOf("table-layout:fixed"));

  it("cannot be widened by a long value", () => {
    // A transaction id like pay_TVRveT4vxunVyT has no break opportunity, so an
    // auto-layout table grows to fit it and the text runs straight through the
    // rounded border of its own box.
    expect(panel).toContain("table-layout:fixed");
    expect(panel).toMatch(/class="em-cell em-label" width="40%"/);
    expect(panel).toMatch(/class="em-cell em-value" width="60%"/);
  });

  it("gives a long value somewhere to wrap", () => {
    // Fixed columns alone would clip rather than wrap.
    expect(panel).toContain("word-break:break-word");
    expect(panel).toContain("overflow-wrap:anywhere");
    // Word ignores both of those and needs its own.
    expect(panel).toContain("word-wrap:break-word");
  });

  it("rules off the total instead of listing it like any other row", () => {
    const total = panel.slice(panel.indexOf("Total paid"));
    expect(total).toMatch(/font-size:18px/);
    expect(panel).toMatch(/border-top:1px solid/);
  });

  it("stacks the columns on a phone", () => {
    // 40% of a 320px screen is not enough for a transaction id, and a
    // right-aligned value under a left-aligned label reads as a mistake.
    expect(receipt).toMatch(/\.em-cell \{ display:block !important; width:100% !important; \}/);
    expect(receipt).toMatch(/\.em-value \{[^}]*text-align:left !important;/);
  });

  it("aligns the panel title with the rows beneath it", () => {
    const title = panel.slice(0, panel.indexOf("em-label"));
    expect(title).toMatch(/padding:16px 18px 4px/);
    expect(panel).toMatch(/padding:16px 10px 7px 18px|padding:7px 10px 7px 18px/);
  });
});

describe("what is sent matches what is designed", () => {
  const generator = readFileSync("scripts/generate-template-seed.mjs", "utf8");

  it("can push a shell change into the rows that are actually sent", () => {
    // The seed runs once. Without a refresh path, editing emailTemplates.ts
    // changes nothing a recipient ever sees — which is exactly what happened.
    expect(generator).toContain("--refresh");
    expect(generator).toContain("UPDATE public.email_templates");
  });

  it("refreshes only the platform's own rows", () => {
    // A coach's edits live in a row keyed on their coach_id.
    expect(generator).toContain("WHERE coach_id IS NULL AND template_key = ");
  });
});
