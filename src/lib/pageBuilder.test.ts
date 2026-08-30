import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  isFullDocument,
  MAX_PROMPT_CHARS,
  PAGE_TYPES,
  partialDocument,
  slugify,
  promptSuggestions,
  toPreviewDocument,
  VIEWPORTS,
  type PageType,
} from "./pageBuilder";

describe("slugify", () => {
  it("makes a URL-safe slug", () => {
    expect(slugify("Growth Masterclass Landing")).toBe("growth-masterclass-landing");
  });

  it("strips punctuation and collapses separators", () => {
    expect(slugify("Hello,   World!! — Again__now")).toBe("hello-world-again-now");
  });

  it("trims leading and trailing dashes", () => {
    expect(slugify("  --hello--  ")).toBe("hello");
  });

  it("never returns an empty slug", () => {
    // An empty slug would collide with the listing route.
    expect(slugify("!!!")).toBe("page");
    expect(slugify("")).toBe("page");
  });

  it("caps the length", () => {
    expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(60);
  });
});

describe("isFullDocument", () => {
  it("recognises a complete document", () => {
    expect(isFullDocument("<!doctype html><html><body>hi</body></html>")).toBe(true);
    expect(isFullDocument("<html lang='en'></html>")).toBe(true);
  });

  it("treats a fragment as a fragment", () => {
    expect(isFullDocument("<section><h1>hi</h1></section>")).toBe(false);
  });
});

describe("toPreviewDocument", () => {
  it("passes a full document through untouched", () => {
    const doc = "<!doctype html><html><body>hi</body></html>";
    expect(toPreviewDocument(doc)).toBe(doc);
  });

  it("wraps a fragment so it renders on its own", () => {
    const out = toPreviewDocument("<h1>Hi</h1>", "h1{color:red}");
    expect(out).toContain("<!doctype html");
    expect(out).toContain("<h1>Hi</h1>");
    expect(out).toContain("h1{color:red}");
    expect(out).toContain("viewport");
  });

  it("does not nest one document inside another", () => {
    // Wrapping a full document in a second <body> drops the outer styling.
    const doc = "<!doctype html><html><head><style>b{}</style></head><body>x</body></html>";
    const out = toPreviewDocument(doc);
    expect(out.match(/<body/g)).toHaveLength(1);
  });
});

describe("viewports", () => {
  it("offers mobile, tablet and desktop widths", () => {
    expect(Object.keys(VIEWPORTS)).toEqual(["mobile", "tablet", "desktop"]);
    expect(VIEWPORTS.mobile.width).toBeLessThan(VIEWPORTS.tablet.width);
    expect(VIEWPORTS.tablet.width).toBeLessThan(VIEWPORTS.desktop.width);
  });
});

describe("generated pages are rendered safely", () => {
  const editor = readFileSync("src/pages/PageEditor.tsx", "utf8");
  const publicPage = readFileSync("src/pages/PublicPage.tsx", "utf8");
  const list = readFileSync("src/pages/PageBuilder.tsx", "utf8");

  it("previews inside a fully sandboxed frame", () => {
    // Authored markup must never run in the app's own origin, where it would
    // reach the visitor's session.
    expect(editor).toContain('sandbox=""');
    expect(editor).toContain("srcDoc");
  });

  it("renders thumbnails inert", () => {
    expect(list).toContain('sandbox=""');
    expect(list).toContain("pointer-events-none");
  });

  it("serves published pages sandboxed, without scripts by default", () => {
    expect(publicPage).toContain("sandbox=");
    expect(publicPage).not.toMatch(/sandbox="[^"]*allow-scripts/);
    expect(publicPage).not.toContain("dangerouslySetInnerHTML");
  });

  it("never injects page markup into the app document", () => {
    for (const src of [editor, publicPage, list]) {
      expect(src).not.toContain("dangerouslySetInnerHTML");
    }
  });
});

describe("generation prompt", () => {
  const fn = readFileSync("supabase/functions/generate-page/index.ts", "utf8");

  it("asks for a self-contained document", () => {
    expect(fn).toContain("<!doctype html>");
    expect(fn).toMatch(/no external stylesheets|No external stylesheets/i);
    expect(fn).toMatch(/zero network requests/i);
  });

  it("asks for responsive, accessible output", () => {
    expect(fn).toMatch(/mobile-first/i);
    expect(fn).toMatch(/semantic landmarks/i);
    expect(fn).toMatch(/contrast/i);
  });

  it("rejects a reply that is not a whole page", () => {
    // A truncated or chatty response would otherwise be saved as the page.
    expect(fn).toContain("looksLikeDocument");
    expect(fn).toMatch(/replied with text instead of a page/i);
  });

  it("supports iterating on an existing page", () => {
    expect(fn).toContain("existing_html");
    expect(fn).toContain("EDIT_SYSTEM");
  });
});

describe("page types", () => {
  const migration = readFileSync("supabase/migrations/20260829140000_page_types.sql", "utf8");

  it("offers exactly the kinds the database accepts", () => {
    // A kind the CHECK constraint rejects would fail only at insert time, in
    // front of the user, with a constraint error for a message.
    const allowed = migration
      .match(/page_type\s+IN\s*\(([^)]*)\)/i)?.[1]
      .match(/'([a-z_]+)'/g)
      ?.map((q) => q.slice(1, -1));

    expect(allowed).toBeDefined();
    expect(Object.keys(PAGE_TYPES).sort()).toEqual([...allowed!].sort());
  });

  it("describes every kind well enough to choose between them", () => {
    for (const [key, spec] of Object.entries(PAGE_TYPES)) {
      expect(spec.label, key).toBeTruthy();
      expect(spec.description.length, key).toBeGreaterThan(20);
      expect(spec.samplePrompt.length, key).toBeGreaterThan(30);
    }
  });
});

describe("briefs for each kind of page", () => {
  const fn = readFileSync("supabase/functions/generate-page/index.ts", "utf8");

  it("has a brief for every kind the app can create", () => {
    for (const key of Object.keys(PAGE_TYPES)) {
      expect(fn, key).toContain(`  ${key}: \``);
    }
  });

  it("never asks a checkout design for its own form or pay button", () => {
    // The platform renders the real form beside it. A generated second form
    // takes money nowhere, and a generated second total contradicts the price
    // actually being charged.
    const checkout = fn.slice(fn.indexOf("  checkout: `"), fn.indexOf("  success: `"));
    expect(checkout).toMatch(/do NOT include a\s*\n?form/i);
    expect(checkout).not.toContain("data-pay-button");
    expect(checkout).not.toContain('name="full_name"');
  });

  it("tells a confirmation page not to sell again", () => {
    const success = fn.slice(fn.indexOf("  success: `"), fn.indexOf("  thank_you: `"));
    expect(success).toMatch(/must not ask for another purchase/i);
  });
});

describe("designed pages replace the defaults safely", () => {
  const checkout = readFileSync("src/pages/ServiceCheckout.tsx", "utf8");
  const success = readFileSync("src/pages/ServiceCheckoutSuccess.tsx", "utf8");
  const tenantHome = readFileSync("src/components/TenantHome.tsx", "utf8");

  it("renders a designed checkout panel without scripts", () => {
    expect(checkout).toContain('sandbox=""');
    expect(checkout).toContain("customPanel");
  });

  it("keeps the real payment column when a design is shown", () => {
    // The design replaces the product panel only; swapping out the payment
    // column would mean a page that cannot take money.
    const designed = checkout.indexOf("{customPanel ? (");
    const payment = checkout.indexOf("{/* RIGHT: payment */}");
    expect(designed).toBeGreaterThan(-1);
    expect(payment).toBeGreaterThan(designed);
  });

  it("shows a designed confirmation page only after the payment verifies", () => {
    // Rendering it earlier would tell a buyer their failed payment succeeded.
    expect(success.indexOf("if (verifyError)")).toBeLessThan(success.indexOf("if (customPage)"));
    expect(success.indexOf("if (loading || verifying)")).toBeLessThan(
      success.indexOf("if (customPage)"),
    );
  });

  it("serves a tenant home page without scripts and only to signed-out visitors", () => {
    expect(tenantHome).not.toMatch(/sandbox="[^"]*allow-scripts/);
    expect(tenantHome).toContain("is_tenant_home");
    expect(tenantHome).toContain("user");
  });

  it("never injects any of them into the app document", () => {
    for (const src of [checkout, success, tenantHome]) {
      expect(src).not.toContain("dangerouslySetInnerHTML");
    }
  });
});

describe("what a visitor may read of a page", () => {
  const grants = readFileSync(
    "supabase/migrations/20260829170000_builder_pages_anon_columns.sql",
    "utf8",
  );

  it("keeps the author's brief off the public API", () => {
    // A published page is public; the prompt behind it is the coach writing
    // privately about their own buyers, and is not.
    expect(grants).toMatch(/REVOKE SELECT ON public\.builder_pages FROM anon/);

    const granted = grants
      .slice(grants.indexOf("GRANT SELECT ("))
      .match(/^\s*([a-z_]+),?$/gm)!
      .map((l) => l.trim().replace(",", ""));

    expect(granted).not.toContain("prompt");
    expect(granted).not.toContain("last_prompt");
  });

  it("still grants every column a visitor's page needs", () => {
    for (const col of ["html", "css", "slug", "page_type", "service_id", "is_tenant_home"]) {
      expect(grants, col).toContain(`\n  ${col}`);
    }
  });
});

describe("a page that outgrows one reply", () => {
  const client = readFileSync("supabase/functions/_shared/aiClient.ts", "utf8");
  const fn = readFileSync("supabase/functions/generate-page/index.ts", "utf8");

  it("notices when a provider stopped for room rather than because it finished", () => {
    // Each provider reports it differently, and getting any of them wrong
    // turns a truncated page into a silent failure.
    expect(client).toContain('data.choices?.[0]?.finish_reason === "length"');
    expect(client).toContain('data.stop_reason === "max_tokens"');
    expect(client).toContain('data.candidates?.[0]?.finishReason === "MAX_TOKENS"');
  });

  it("asks for the rest instead of discarding a cut-off document", () => {
    expect(client).toContain("export async function generateLongText");
    expect(fn).toContain("generateLongText");
    expect(fn).toContain("const isComplete = (text: string) => looksLikeDocument(extractHtml(text));");
  });

  it("stops once the document closes, so a short page costs one call", () => {
    const long = client.slice(client.indexOf("export async function generateLongText"));
    expect(long).toContain("if (request.isComplete?.(text)) return");
    expect(long).toContain("if (!truncated) break;");
    // A reply that adds nothing would otherwise loop to the round limit.
    expect(long).toContain("if (!result.text.trim()) break;");
  });

  it("does not send Anthropic a prefill it will reject", () => {
    // Anthropic 400s on an assistant turn ending in whitespace, which is
    // exactly how a partial HTML document ends.
    expect(client).toContain("request.continueFrom.trimEnd()");
  });

  it("says which failure happened when a page still will not finish", () => {
    expect(fn).toMatch(/longer than the model will write/);
    expect(fn).toMatch(/replied with text instead of a page/);
  });

  it("refuses to answer a thin brief with a question", () => {
    // "Create" is a real brief a coach will type, and a clarifying question
    // back is not a page.
    expect(fn).toMatch(/never ask a\s*\n?clarifying question/i);
  });
});

describe("the editor asks for the kind of page it is editing", () => {
  const editor = readFileSync("src/pages/PageEditor.tsx", "utf8");

  it("sends the page's own type, not always a landing page", () => {
    expect(editor).toContain('page_type: page?.page_type ?? "landing"');
  });

  it("rebuilds the generator when that type arrives", () => {
    // The auto-generate effect fires the moment the page loads. A callback
    // memoised without page_type closes over the null page and every checkout
    // and confirmation page is generated from the landing-page brief.
    const callback = editor.slice(
      editor.indexOf("const generate = useCallback("),
      editor.indexOf("// A brief entered on the previous screen"),
    );
    expect(callback).toContain("page?.page_type");
    expect(callback.match(/\[html, page\?\.page_type, toast\]/)).toBeTruthy();
  });

  it("passes the product context it was handed", () => {
    expect(editor).toContain("context: contextRef.current");
  });
});

describe("partialDocument", () => {
  it("returns nothing until a document has actually started", () => {
    // A preview must never flash a stray fence at the viewer.
    expect(partialDocument("")).toBe("");
    expect(partialDocument("```html\n")).toBe("");
    expect(partialDocument("Sure! Here is your page:\n")).toBe("");
  });

  it("strips the opening fence and any prose before the document", () => {
    expect(partialDocument("```html\n<!doctype html><html><body>hi")).toBe(
      "<!doctype html><html><body>hi",
    );
    expect(partialDocument("Here you go:\n<html><body>hi")).toBe("<html><body>hi");
  });

  it("drops a tag that is still being typed", () => {
    // "<sec" rendered as text would show up as literal characters on the page.
    expect(partialDocument("<html><body><h1>Hi</h1><sec")).toBe("<html><body><h1>Hi</h1>");
    expect(partialDocument('<html><body><div class="he')).toBe("<html><body>");
  });

  it("leaves a complete document alone", () => {
    const doc = "<!doctype html><html><body>hi</body></html>";
    expect(partialDocument(doc)).toBe(doc);
  });
});

describe("watching a page get written", () => {
  const client = readFileSync("supabase/functions/_shared/aiClient.ts", "utf8");
  const fn = readFileSync("supabase/functions/generate-page/index.ts", "utf8");
  const editor = readFileSync("src/pages/PageEditor.tsx", "utf8");

  it("streams from every provider shape", () => {
    expect(client).toContain("export async function streamText");
    // Each shape frames its deltas differently.
    expect(client).toContain('payload?.type === "content_block_delta"');
    expect(client).toContain("payload?.candidates?.[0]?.content?.parts");
    expect(client).toContain("choice?.delta?.content");
    expect(client).toContain("streamGenerateContent?alt=sse");
  });

  it("falls back to a normal call when a provider will not stream", () => {
    // A self-hosted endpoint that rejects stream:true must not lose the
    // feature outright.
    const stream = client.slice(client.indexOf("export async function streamText"));
    expect(stream).toContain("declined to stream");
    expect(stream).toContain("return await generateText(resolved, request);");
  });

  it("sends the page out as server-sent events", () => {
    expect(fn).toContain('"Content-Type": "text/event-stream; charset=utf-8"');
    expect(fn).toContain('type: "delta"');
    expect(fn).toContain('type: "status"');
    expect(fn).toContain('type: "done"');
    expect(fn).toContain('type: "error"');
  });

  it("still answers plain JSON when streaming was not asked for", () => {
    expect(fn).toContain("if (body.stream)");
    expect(fn).toContain("generateLongText");
  });

  it("shows the coach the text, the elapsed time and what it is doing", () => {
    expect(editor).toContain("streamedText");
    expect(editor).toContain("KB written");
    expect(editor).toContain("livePreview");
    expect(editor).toContain("partialDocument");
  });

  it("survives an older function that answers with JSON", () => {
    expect(editor).toContain('res.headers.get("content-type")?.includes("text/event-stream")');
  });

  it("says so when the connection dies before the page is finished", () => {
    // Silently keeping a half-written page would be worse than an error.
    expect(editor).toContain("The generation was cut short");
  });
});

describe("follow-up prompts", () => {
  it("offers a way to start every kind of page", () => {
    for (const type of Object.keys(PAGE_TYPES) as PageType[]) {
      const groups = promptSuggestions(type, false);
      expect(groups, type).toHaveLength(1);
      expect(groups[0].prompts.length, type).toBeGreaterThan(0);
    }
  });

  it("offers sections and refinements once a page exists", () => {
    const groups = promptSuggestions("landing", true);
    expect(groups.map((g) => g.title)).toEqual(["Add a section", "Refine the whole page"]);
    expect(groups[0].prompts.length).toBeGreaterThan(5);
  });

  it("suggests sections that suit the page", () => {
    // A checkout panel has no pricing tiers to add — the platform charges the
    // price — and a confirmation page must never try to sell again.
    const checkout = promptSuggestions("checkout", true)[0].prompts.map((p) => p.label);
    expect(checkout).toContain("What's included");
    expect(checkout).not.toContain("Pricing");

    const success = promptSuggestions("success", true)[0].prompts.map((p) => p.label);
    expect(success).toContain("Next steps");
    expect(success.join(" ")).not.toMatch(/pricing|buy/i);
  });

  it("writes prompts specific enough to act on", () => {
    for (const type of Object.keys(PAGE_TYPES) as PageType[]) {
      for (const group of promptSuggestions(type, true)) {
        for (const suggestion of group.prompts) {
          // A chip label is scannable; the prompt behind it has to carry
          // enough detail that the model does not have to guess.
          expect(suggestion.label.length, suggestion.label).toBeLessThan(24);
          expect(suggestion.prompt.length, suggestion.label).toBeGreaterThan(40);
        }
      }
    }
  });

  it("has no duplicate labels within a group", () => {
    for (const type of Object.keys(PAGE_TYPES) as PageType[]) {
      for (const group of promptSuggestions(type, true)) {
        const labels = group.prompts.map((p) => p.label);
        expect(new Set(labels).size, `${type}/${group.title}`).toBe(labels.length);
      }
    }
  });
});

describe("how long a brief may be", () => {
  const editor = readFileSync("src/pages/PageEditor.tsx", "utf8");
  const fn = readFileSync("supabase/functions/generate-page/index.ts", "utf8");

  it("allows a brief far longer than a paragraph", () => {
    // The old limit was 4,000 characters, which rejected exactly the
    // section-by-section briefs that produce the best pages.
    expect(MAX_PROMPT_CHARS).toBeGreaterThanOrEqual(60000);
  });

  it("uses the same limit on both sides", () => {
    const declared = fn.match(/const MAX_PROMPT_CHARS = (\d+);/)?.[1];
    expect(declared).toBe(String(MAX_PROMPT_CHARS));
  });

  it("says how long the brief is and what the limit is", () => {
    // "That description is too long" left the coach guessing by how much.
    expect(fn).toContain("prompt.length.toLocaleString()");
    expect(fn).toContain("MAX_PROMPT_CHARS.toLocaleString()");
    expect(fn).not.toContain(String.raw`"That description is too long"`);
  });

  it("never silently truncates what was typed", () => {
    expect(editor).not.toMatch(/maxLength=\{?\d/);
    expect(fn).toContain(String.raw`String(body.prompt || "").trim()`);
    expect(fn).not.toMatch(/prompt\.slice\(0/);
  });

  it("catches an over-long brief before spending a round trip", () => {
    expect(editor).toContain("brief.length > MAX_PROMPT_CHARS");
  });

  it("grows the box to fit the brief", () => {
    expect(editor).toContain("useAutoGrow");
  });
});

describe("a reply that is not a document", () => {
  const fn = readFileSync("supabase/functions/generate-page/index.ts", "utf8");
  const editor = readFileSync("src/pages/PageEditor.tsx", "utf8");

  it("salvages real markup that is only missing its shell", () => {
    // Throwing away a page's worth of correct HTML over a missing <html> tag
    // would be the wrong trade every time.
    expect(fn).toContain("function ensureDocument");
    expect(fn).toContain("looksLikeFragment");
  });

  it("asks once more when the model answered in the wrong form", () => {
    // A markdown brief invites a markdown reply; saying so plainly fixes it.
    expect(fn).toContain("STRICT_RETRY");
    expect(fn).toContain("if (!html && !result.truncated)");
  });

  it("does not retry a truncated reply", () => {
    // That needs a shorter brief, not a firmer instruction, and a second
    // attempt would spend the same tokens to fail the same way.
    const guard = fn.slice(fn.indexOf("let html = ensureDocument"));
    expect(guard).toContain("!result.truncated");
  });

  it("tells the coach what came back instead", () => {
    expect(fn).toContain("The model replied with text instead of a page");
    expect(fn).toContain("result.text.trim().replace");
  });

  it("clears the abandoned attempt from the screen", () => {
    expect(fn).toContain('type: "reset"');
    expect(editor).toContain('event.type === "reset"');
  });

  it("tells the model to build a markdown brief rather than echo it", () => {
    expect(fn).toMatch(/Do not answer in markdown/);
  });
});
