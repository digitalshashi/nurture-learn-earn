// Generates a complete, self-contained web page from a prompt.
//
// The existing generate-landing-page fills fields in one fixed React template,
// so every page it makes looks the same. This returns real HTML and CSS, which
// is what makes the builder a builder rather than a form.

import { corsHeaders, json, requireUser } from "../_shared/edge.ts";
import {
  applyEditBlocks,
  hasUnclosedBlock,
  parseEditBlocks,
} from "../_shared/editBlocks.ts";
import {
  AiError,
  generateLongText,
  resolveModel,
  streamLongText,
} from "../_shared/aiClient.ts";

const SYSTEM = `You are a senior front-end engineer who writes production landing pages.

Return ONLY a single fenced block of HTML, nothing else — no commentary, no
markdown around it beyond the fence.

Rules for the page you write:
- One complete <!doctype html> document.
- All CSS in a single <style> tag in <head>. No external stylesheets, no CDN
  links, no <script src>. The page must render with zero network requests.
- No JavaScript unless the user explicitly asks for interactivity; if they do,
  inline it in one <script> tag and keep it dependency-free.
- Responsive: a mobile-first layout that also works at 1280px. Use CSS grid or
  flexbox, relative units, and max-width containers.
- Accessible: semantic landmarks (header/main/section/footer), one <h1>,
  descriptive alt text, labels tied to inputs, and colour contrast of at least
  4.5:1 for body text.
- Use system fonts: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
  Helvetica, Arial, sans-serif.
- For images use inline SVG or a CSS gradient placeholder. Never hotlink an
  external image.
- Write real, specific copy for the subject given. Never leave lorem ipsum or
  "Your text here".

A brief may be one word, or vague. That is not a reason to stop: never ask a
clarifying question, never explain what you would need, and never reply with
prose. Decide the specifics yourself — an audience, an offer, a tone — and
write the page. A page built on a guess can be edited; a question cannot.

A brief may also arrive as a long specification, written in markdown, with
headings, bullets and copy already drafted. Build that specification into the
page. Do not answer in markdown, do not restate the plan, and do not comment on
it — the reply is always the HTML document itself, whatever form the brief
took.`;


/**
 * What each kind of page must contain.
 *
 * A checkout without an order summary, or a confirmation without "what happens
 * next", is not usable — so the requirements are stated rather than hoped for.
 */
const PAGE_BRIEFS: Record<string, string> = {
  landing: `Build a landing page. It must have: a hero with one clear headline
and a single primary call to action; a section explaining who it is for; three
to five benefits; social proof; an FAQ; and a closing call to action.`,

  sales: `Build a long-form sales page. It must have: a hero with the promise
and price; the problem stated in the reader's words; what they get, itemised;
proof (testimonials, results, credentials); pricing with what is included;
a guarantee or risk reversal; an FAQ handling objections; and repeated calls to
action between sections.`,

  checkout: `Build the product panel of a checkout page.

This panel is shown on the left of the real checkout; the platform renders the
billing form and the pay button beside it, on the right. So do NOT include a
form, a payment button, card fields, or any price total that could be mistaken
for the amount being charged — a second form or button on a checkout page loses
sales and a second total loses trust.

It must have: the product name as the headline; one sentence on the outcome the
buyer gets; what is included, itemised; the price shown once, as a fact rather
than a call to action; proof (a testimonial, a result, or a credential);
a guarantee or refund line; and a short "questions?" note.

Design it for a single narrow column — roughly 560px wide, full page height.
No navigation menu, no footer links, nothing that leads away from the purchase.`,

  success: `Build an order confirmation page. It must have: a clear confirmation
that the payment succeeded; an order summary with the item and amount paid; a
numbered list of what happens next with realistic timing; one primary button to
start using what was bought; and a line telling the buyer where to get help.
It must not ask for another purchase — the sale is done. Mark the primary
button with data-primary-action.`,

  thank_you: `Build a thank-you page for someone who has just signed up or
registered. It must have: a warm confirmation; what they should expect and
when; one clear next step; and a note about checking spam if an email was
promised.`,

  webinar: `Build a webinar registration page. It must have: the topic and the
promise; date, time and duration stated prominently; who it is for; what will
be covered as bullets; the host with credentials; a registration form with name
and email; and a note that a recording will be sent.`,
};

const briefFor = (type: string) => PAGE_BRIEFS[type] ?? PAGE_BRIEFS.landing;

/**
 * Editing rewrites only what changes.
 *
 * Asking for the whole document back on every tweak was slow, spent the output
 * budget of a fresh page on a one-line change, and quietly rewrote copy the
 * coach had already settled — no model reproduces 900 lines verbatim, so
 * details drifted with every pass. Search-and-replace blocks change what was
 * asked for and leave the rest byte-for-byte alone.
 */
const EDIT_SYSTEM = `You are editing an existing HTML page for a coaching and
course platform. You make surgical edits — never rewrites.

Reply with one or more edit blocks in exactly this format, and nothing else:

<<<<<<< SEARCH
the exact text to find
=======
the text to replace it with
>>>>>>> REPLACE

Rules:
- SEARCH must be copied character for character from the page you were given,
  including indentation. It is matched exactly; if it does not match, the edit
  is dropped.
- Keep SEARCH as short as it can be while still appearing exactly once in the
  page. Two or three lines is usually right; a whole section is not.
- To add something, SEARCH for the line it should sit before or after, and
  repeat that line in REPLACE alongside the new markup.
- To delete something, leave REPLACE empty.
- Use several small blocks rather than one enormous one. A new section plus the
  CSS it needs is two blocks: one inside <style>, one inside <body>.
- Change nothing you were not asked to. Do not reformat, do not rewrite copy
  that was not mentioned, do not improve anything in passing.
- CSS for a new section goes inside the existing <style> tag, in the same
  visual language as the rest of the page — the same palette, spacing scale and
  type. A new section must look like it was always there.
- No commentary before, between or after the blocks.`;

/**
 * The fallback when no edit block could be matched.
 *
 * Slower, and it loses the byte-for-byte guarantee, but a coach whose change
 * silently did nothing is worse off than one whose page was rewritten.
 */
const REWRITE_SYSTEM = `${SYSTEM}

You are editing an existing page. Apply the requested change and return the
COMPLETE updated document. Preserve everything the user did not ask you to
change — content, structure and styling alike.`;


/** Pulls the document out of a fenced block, tolerating a chatty model. */
function extractHtml(raw: string): string {
  const fenced = raw.match(/```(?:html)?\s*\n([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : raw).trim();

  // If the model ignored the instruction and prefixed prose, start at the doc.
  const docStart = body.search(/<!doctype html|<html[\s>]/i);
  return docStart > 0 ? body.slice(docStart).trim() : body;
}

/** Separates the <style> block so the editor can show CSS on its own. */
function splitCss(html: string): { html: string; css: string } {
  const match = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  return { html, css: match ? match[1].trim() : "" };
}

/**
 * How long a brief may be.
 *
 * Roughly 15,000 tokens: comfortably inside every model this app can call,
 * while still stopping an accidental paste of an entire document.
 */
const MAX_PROMPT_CHARS = 60000;

/** Markup that is a page's worth of content, but missing its shell. */
const looksLikeFragment = (html: string) =>
  /^\s*<(section|main|header|article|div|style|h1|nav|body)[\s>]/i.test(html);

/**
 * A complete document, from whatever the model actually returned.
 *
 * A reply that is real markup but has no <html> wrapper is a near miss, not a
 * failure — throwing away a page's worth of correct HTML over a missing shell
 * would be the wrong trade every time. Returns "" when there is nothing worth
 * salvaging.
 */
function ensureDocument(html: string): string {
  if (looksLikeDocument(html)) return html;
  if (!looksLikeFragment(html)) return "";

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>Page</title>",
    "</head>",
    "<body>",
    html,
    "</body>",
    "</html>",
  ].join("\n");
}

/**
 * Appended when a first reply was not a document at all.
 *
 * A model handed a markdown brief will sometimes answer in markdown. Saying so
 * plainly fixes it far more often than rewording the original instruction.
 */
const STRICT_RETRY = `

IMPORTANT: your previous reply was not an HTML document. Return ONLY one
complete HTML document. Start with <!doctype html> and end with </html>. No
markdown, no headings, no explanation, no commentary — the document alone.`;

const looksLikeDocument = (html: string) => /<html[\s>]/i.test(html) && /<\/html>/i.test(html);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    const userId = auth.userId;

    const body = await req.json().catch(() => ({}));
    const prompt = String(body.prompt || "").trim();
    const existingHtml = String(body.existing_html || "").trim();
    const pageType = String(body.page_type || "landing").trim();

    if (!prompt) return json({ error: "Describe the page you want" }, 400);

    // The real ceiling is the model's context window, not a number chosen here.
    // A detailed brief — section by section, with the copy written out — runs
    // to tens of thousands of characters, and refusing that was refusing the
    // briefs most likely to produce a good page. This is left only as a guard
    // against a runaway paste, and is stated in the message so it is
    // actionable rather than mysterious.
    if (prompt.length > MAX_PROMPT_CHARS) {
      return json(
        {
          error: `That brief is ${prompt.length.toLocaleString()} characters. The limit is ${MAX_PROMPT_CHARS.toLocaleString()} — trim it, or split the page into two generations.`,
        },
        400,
      );
    }

    // A full page needs plenty of room — a truncated document is unusable.
    const model = await resolveModel(userId, "text", { maxTokens: 8000, temperature: 0.6 });

    // Real product details, so a checkout page is not generated with invented
    // prices that then have to be corrected by hand.
    const context = body.context as Record<string, string> | undefined;
    const contextLines = context
      ? "\n\nUse these exact details:\n" +
        Object.entries(context)
          .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
          .map(([k, v]) => `- ${k.replace(/_/g, " ")}: ${v}`)
          .join("\n")
      : "";

    const isEdit = existingHtml.length > 0;
    const userMessage = isEdit
      ? `Here is the current page:\n\n\`\`\`html\n${existingHtml}\n\`\`\`\n\nChange requested: ${prompt}`
      : `${briefFor(pageType)}

Subject: ${prompt}${contextLines}`;

    const isComplete = (text: string) => looksLikeDocument(extractHtml(text));

    /**
     * Writes the page, and gives the model one more chance if the first reply
     * was not usable.
     *
     * An edit returns search-and-replace blocks, which are applied to the page
     * that already exists — so a follow-up costs the tokens of the change, not
     * of the whole document, and everything untouched stays exactly as it was.
     * A fresh page returns the document itself.
     *
     * onDelta streams the text as it is written; onReset says the previous
     * attempt is being abandoned, so a viewer can clear what it has shown.
     */
    const buildPage = async (
      onDelta?: (text: string) => void,
      onRound?: (round: number) => void,
      onReset?: (message?: string) => void,
    ) => {
      const run = async (useSystem: string, message: string, complete?: (t: string) => boolean) => {
        const request = { system: useSystem, prompt: message, isComplete: complete, onRound };
        return onDelta
          ? await streamLongText(model, request, onDelta)
          : await generateLongText(model, request);
      };

      if (isEdit) {
        // Done as soon as a block closes and nothing is left half-written.
        const editsComplete = (text: string) =>
          parseEditBlocks(text).length > 0 && !hasUnclosedBlock(text);

        const edit = await run(EDIT_SYSTEM, userMessage, editsComplete);
        const blocks = parseEditBlocks(edit.text);
        const result = applyEditBlocks(existingHtml, blocks);

        if (result.applied > 0) {
          if (result.failed.length) {
            console.error(
              `generate-page: ${result.failed.length} of ${blocks.length} edits did not match`,
              result.failed,
            );
          }
          return {
            html: result.html,
            result: edit,
            edits: { applied: result.applied, failed: result.failed.length },
          };
        }

        // Nothing matched — the model quoted the page wrongly, or answered in
        // prose. Rewriting the whole document is slower and loses the byte-for
        // -byte guarantee, but it is far better than telling the coach their
        // change did nothing.
        console.error(
          `generate-page: no edit block matched (${blocks.length} parsed); rewriting in full`,
        );
        onReset?.("Rewriting the page instead…");

        const rewrite = await run(REWRITE_SYSTEM, userMessage, isComplete);
        return {
          html: ensureDocument(extractHtml(rewrite.text)),
          result: rewrite,
          edits: { applied: 0, failed: blocks.length },
        };
      }

      let result = await run(SYSTEM, userMessage, isComplete);
      let html = ensureDocument(extractHtml(result.text));

      // Only worth retrying when the model finished and simply answered in the
      // wrong form. A truncated reply needs a shorter brief, not a firmer one.
      if (!html && !result.truncated) {
        console.error("generate-page: first reply was not a document; retrying strictly");
        onReset?.("That wasn't a page. Asking again…");
        result = await run(SYSTEM, userMessage + STRICT_RETRY, isComplete);
        html = ensureDocument(extractHtml(result.text));
      }

      return { html, result, edits: null };
    };

    /** What went wrong, in terms the coach can act on. */
    const failureMessage = (result: { text: string; truncated: boolean }) => {
      if (result.truncated) {
        return "This page is longer than the model will write, even across several attempts. Ask for something simpler, or switch to a model with a bigger output limit in Settings > AI providers.";
      }
      // Showing what did come back turns "it didn't work" into something a
      // coach can actually report or reason about.
      const preview = result.text.trim().replace(/\s+/g, " ").slice(0, 140);
      return preview
        ? `The model replied with text instead of a page: "${preview}…". Try again, or pick a stronger model in Settings > AI providers.`
        : "The model returned nothing. Try again, or pick a different model in Settings > AI providers.";
    };

    // Writing a page takes tens of seconds. Streaming it turns that wait into
    // something the coach can watch and judge, instead of a spinner over an
    // empty panel that looks identical to a hang.
    if (body.stream) {
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          const send = (event: unknown) => {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            } catch {
              // The coach navigated away; nothing left to write to.
            }
          };

          try {
            send({
              type: "status",
              message: isEdit ? "Working out what to change…" : "Planning the page…",
              // Edit mode streams change blocks, not a document, so the viewer
              // must not try to render the text as a page.
              mode: isEdit ? "edit" : "page",
            });

            const { html: streamedHtml, result: streamed, edits: streamedEdits } = await buildPage(
              (delta) => send({ type: "delta", text: delta }),
              (round) =>
                send({
                  type: "status",
                  message: `Still writing — picking up where it stopped (part ${round})…`,
                  round,
                }),
              (message) => {
                send({ type: "reset" });
                if (message) send({ type: "status", message });
              },
            );

            if (!streamedHtml) {
              console.error(
                `generate-page stream incomplete after ${streamed.rounds} rounds`,
                `truncated=${streamed.truncated}`,
                `chars=${streamed.text.length}`,
              );
              send({ type: "error", error: failureMessage(streamed) });
              return;
            }

            const streamedSplit = splitCss(streamedHtml);
            send({
              type: "done",
              edits: streamedEdits,
              html: streamedSplit.html,
              css: streamedSplit.css,
              model: model.model ?? null,
              edited: isEdit,
              page_type: pageType,
              rounds: streamed.rounds,
            });
          } catch (e) {
            console.error("generate-page stream error:", e);
            send({
              type: "error",
              error: e instanceof AiError ? e.message : "The generator stopped unexpectedly.",
            });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    // A whole page with its CSS inline runs past what most models will emit
    // in one reply, and a document cut off mid-tag is unusable. So ask for the
    // rest until the document closes.
    const { html, result, edits } = await buildPage();

    if (!html) {
      console.error(
        `generate-page incomplete after ${result.rounds} rounds`,
        `truncated=${result.truncated}`,
        `chars=${result.text.length}`,
      );
      return json({ error: failureMessage(result) }, 502);
    }

    const split = splitCss(html);

    return json({
      html: split.html,
      css: split.css,
      model: model.model ?? null,
      edited: isEdit,
      edits,
      page_type: pageType,
      // Useful when a page comes out oddly: it took more than one reply.
      rounds: result.rounds,
    });
  } catch (err) {
    if (err instanceof AiError) return json({ error: err.message }, err.status);
    console.error("generate-page error:", err);
    return json({ error: err instanceof Error ? err.message : "Generation failed" }, 500);
  }
});
