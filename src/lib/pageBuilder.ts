export type PageType = "landing" | "checkout" | "success" | "sales" | "webinar" | "thank_you";

/** What each kind of page is for, shown wherever one can be created. */
export const PAGE_TYPES: Record<PageType, { label: string; description: string; samplePrompt: string }> = {
  landing: {
    label: "Landing page",
    description: "A page that introduces an offer and drives one action.",
    samplePrompt: "A landing page for a 6-week coaching programme for early-career designers. Dark hero, three benefit cards, a testimonial and an email signup.",
  },
  sales: {
    label: "Sales page",
    description: "Long-form, for a considered purchase: proof, pricing, objections.",
    samplePrompt: "A sales page for a ₹14,999 mentorship. Warm and direct, with results, pricing and an FAQ answering the usual objections.",
  },
  checkout: {
    label: "Checkout page",
    // The billing form and pay button stay with the platform — this is the
    // panel beside them, so a design can never break a payment.
    description: "The product panel shown beside the real payment form.",
    samplePrompt: "Clean and trustworthy. Lead with the outcome, list what's included, then a testimonial and the refund policy.",
  },
  success: {
    label: "Order confirmation",
    description: "Shown after payment: what they bought and what happens next.",
    samplePrompt: "Friendly and reassuring. Confirm the payment, then three numbered steps for getting started.",
  },
  thank_you: {
    label: "Thank-you page",
    description: "For a signup or registration rather than a purchase.",
    samplePrompt: "Warm and brief. Confirm the registration and tell them to check their inbox.",
  },
  webinar: {
    label: "Webinar registration",
    description: "Topic, timing and a short registration form.",
    samplePrompt: "A registration page for a free 45-minute masterclass on pricing your services.",
  },
};

/**
 * The document out of a partially streamed reply.
 *
 * A model opens with a ```html fence and may prefix a line of prose before the
 * document starts. While the reply is still arriving there is no closing fence
 * to match on, so this looks for where the document begins instead — enough to
 * render a page that is still being written.
 *
 * Returns "" until something renderable has arrived, so a preview never
 * flashes a fragment of a fence at the viewer.
 */
export function partialDocument(raw: string): string {
  const withoutFence = raw.replace(/^\s*```(?:html)?\s*\n?/i, "");
  const start = withoutFence.search(/<!doctype html|<html[\s>]/i);
  if (start < 0) return "";

  return withoutFence
    .slice(start)
    // A trailing partial tag renders as stray text; drop it.
    .replace(/<[a-z/][^>]*$/i, "")
    .trimEnd();
}


/** A suggestion the coach can run without typing it. */
export interface PagePrompt {
  /** What the chip says. Short enough to scan a row of them. */
  label: string;
  /** What is actually sent to the generator. */
  prompt: string;
}

export interface PromptGroup {
  title: string;
  hint: string;
  prompts: PagePrompt[];
}

/**
 * Ways to start each kind of page.
 *
 * A blank prompt box is the hardest part of a page builder — these exist so
 * the first page costs a click, and so the shape of a good brief is visible
 * before anyone has to write one.
 */
const PAGE_STARTERS: Record<PageType, PagePrompt[]> = {
  landing: [
    {
      label: "Course launch",
      prompt:
        "A landing page for an online course launch. Dark hero with a bold promise and one call to action, who it is for, four outcome-led benefit cards, a testimonial, a short FAQ and a closing call to action.",
    },
    {
      label: "Coaching programme",
      prompt:
        "A landing page for a 12-week 1:1 coaching programme. Warm and personal, with the transformation up front, what each week covers, the coach's credentials, two testimonials and an application call to action.",
    },
    {
      label: "Free lead magnet",
      prompt:
        "A landing page offering a free guide in exchange for an email. Short and focused: one headline, three bullets on what is inside, a cover mockup drawn in CSS, and an email form. No navigation.",
    },
  ],
  sales: [
    {
      label: "Flagship programme",
      prompt:
        "A long-form sales page for a flagship programme. Open with the problem in the reader's own words, then the promise, what they get itemised, proof, pricing with what is included, a guarantee, an FAQ that answers real objections, and calls to action between sections.",
    },
    {
      label: "Cohort with a deadline",
      prompt:
        "A long-form sales page for a cohort that closes on a date. Lead with the outcome, show the week-by-week curriculum, add results from past cohorts, two pricing tiers, a refund guarantee and an urgency section about the closing date.",
    },
  ],
  checkout: [
    {
      label: "Clean and trusted",
      prompt:
        "Clean and trustworthy. Lead with the outcome in one sentence, list what is included as ticked items, show the price once as a fact, then a short testimonial and the refund policy.",
    },
    {
      label: "Premium feel",
      prompt:
        "Premium and understated. Generous whitespace, a serif headline, the deliverables as a quiet list, one strong result from a past buyer, and a discreet guarantee line.",
    },
  ],
  success: [
    {
      label: "Warm handover",
      prompt:
        "Friendly and reassuring. Confirm the payment, restate what was bought, then three numbered steps for getting started with realistic timing, one button to begin, and a line about where to get help.",
    },
    {
      label: "Onboarding checklist",
      prompt:
        "Confirm the order, then a checklist of four things to do in the first week, each with a one-line why. End with a support email and the expected response time.",
    },
  ],
  thank_you: [
    {
      label: "Registration confirmed",
      prompt:
        "Warm and brief. Confirm the registration, say what arrives and when, tell them to check spam if it does not, and give one clear next step.",
    },
  ],
  webinar: [
    {
      label: "Free masterclass",
      prompt:
        "A registration page for a free 45-minute masterclass. Topic and promise up top, date, time and duration stated prominently, four bullets on what will be covered, the host with credentials, a name and email form, and a note that a recording is sent.",
    },
  ],
};

/**
 * Sections that can be added to an existing page.
 *
 * Each prompt says where the section goes as well as what it contains: a model
 * told only "add an FAQ" tends to append it after the footer.
 */
const SECTIONS: Record<PageType, PagePrompt[]> = {
  landing: [
    { label: "Pricing", prompt: "Add a pricing section with three tiers before the FAQ. Mark the middle tier as the popular one and list what each includes." },
    { label: "Testimonials", prompt: "Add a testimonials section with three quotes, each with a name and a role, placed after the benefits." },
    { label: "FAQ", prompt: "Add an FAQ section with six questions and answers before the closing call to action." },
    { label: "How it works", prompt: "Add a three-step 'How it works' section after the hero, each step numbered with a one-line explanation." },
    { label: "Stats", prompt: "Add a band of four statistics under the hero — students taught, average result, years teaching, satisfaction — with the numbers large." },
    { label: "About the coach", prompt: "Add an 'About' section with a short bio, three credentials and a CSS-drawn portrait placeholder, placed before the FAQ." },
    { label: "Comparison", prompt: "Add a comparison table showing this against the usual alternatives, with ticks and crosses, before the pricing." },
    { label: "Email capture", prompt: "Add an email capture section before the footer with one field, a button and a line about what they will receive." },
    { label: "Guarantee", prompt: "Add a guarantee section after the pricing: what is promised, for how long and how to claim it." },
    { label: "Final CTA", prompt: "Add a full-width closing call-to-action band before the footer, with a restated promise and one button." },
  ],
  sales: [
    { label: "Curriculum", prompt: "Add a curriculum section listing the modules week by week, each with a title and one line on what is covered." },
    { label: "Bonuses", prompt: "Add a bonuses section with three bonuses, each with a name, what it does and a stated value." },
    { label: "Objections", prompt: "Add an objections section that names the four things stopping someone buying and answers each honestly." },
    { label: "Results", prompt: "Add a results section with three case studies: the starting point, what changed and the outcome." },
    { label: "Pricing tiers", prompt: "Add a pricing section with two tiers and a payment-plan option, making clear what each includes." },
    { label: "Guarantee", prompt: "Add a risk-reversal section explaining the guarantee in plain terms, with the exact conditions." },
    { label: "Urgency", prompt: "Add an honest urgency section: what closes, when, and what happens to anyone who misses it." },
  ],
  checkout: [
    { label: "What's included", prompt: "Add a 'What's included' list of ticked deliverables under the headline." },
    { label: "Testimonial", prompt: "Add one short testimonial with a name and result, placed under what is included." },
    { label: "Guarantee", prompt: "Add a refund guarantee line near the bottom, stating the window and how to claim it." },
    { label: "Trust badges", prompt: "Add a quiet row of trust signals — secure payment, instant access, cancel anytime — drawn in CSS, no images." },
    { label: "Short FAQ", prompt: "Add three short questions and answers about access, refunds and support at the bottom." },
    { label: "Contact line", prompt: "Add a 'Questions before you buy?' line with an email address at the very bottom." },
  ],
  success: [
    { label: "Next steps", prompt: "Add a numbered 'What happens next' section with three steps and realistic timing for each." },
    { label: "Order summary", prompt: "Add an order summary panel showing what was bought and the amount paid." },
    { label: "Join the community", prompt: "Add a section inviting them into the community, with one button and a line on what happens there." },
    { label: "Getting started", prompt: "Add a 'Start here' section with the first three things to do, each a single sentence." },
    { label: "Support", prompt: "Add a support section with an email address and the expected response time." },
  ],
  thank_you: [
    { label: "What to expect", prompt: "Add a 'What to expect' section covering what arrives, when, and from which address." },
    { label: "Check spam", prompt: "Add a note about checking the spam folder and whitelisting the sender address." },
    { label: "Next step", prompt: "Add one clear next step with a button, placed under the confirmation." },
    { label: "Follow along", prompt: "Add a short section inviting them to follow along elsewhere, with text links only." },
  ],
  webinar: [
    { label: "Agenda", prompt: "Add an agenda section listing four things the session covers, each with a one-line description." },
    { label: "Host bio", prompt: "Add a host section with a short bio, three credentials and a CSS-drawn portrait placeholder." },
    { label: "Who it's for", prompt: "Add a 'Who this is for' section with three reader types and a line each." },
    { label: "Countdown", prompt: "Add a prominent date, time and timezone block above the registration form." },
    { label: "Recording note", prompt: "Add a line under the form promising the recording to everyone who registers." },
  ],
};

/**
 * Changes to the whole page rather than any one part of it.
 *
 * The same set everywhere: a tone or layout change means the same thing on a
 * checkout page as on a landing page.
 */
const REFINEMENTS: PagePrompt[] = [
  { label: "Dark theme", prompt: "Redo the page in a dark theme: near-black background, light text, one accent colour. Keep every section and all the copy." },
  { label: "Lighter, airier", prompt: "Open the layout up: more whitespace, larger type, fewer borders, and let sections breathe. Change no copy." },
  { label: "Half as long", prompt: "Cut the copy roughly in half. Keep every section, but make each one tighter and remove anything that repeats." },
  { label: "Warmer tone", prompt: "Rewrite the copy in a warmer, more personal voice — second person, shorter sentences, no marketing clichés. Keep the structure." },
  { label: "More premium", prompt: "Make it feel more premium: a restrained palette, a serif display face from the system stack, generous spacing and smaller, quieter buttons." },
  { label: "Bolder", prompt: "Make it bolder: bigger headlines, stronger colour, more contrast between sections. Keep it readable and keep the copy." },
  { label: "Stronger headline", prompt: "Rewrite the main headline and subheadline to lead with the outcome rather than the format. Change nothing else." },
  { label: "Better on mobile", prompt: "Improve the mobile layout: check the spacing at 375px, stack anything cramped, and make tap targets at least 44px." },
  { label: "CTA above the fold", prompt: "Move the primary call to action so it is visible without scrolling on both mobile and desktop." },
];

/**
 * What to offer next, given what kind of page this is and whether one exists.
 *
 * An empty page needs a way in; a written page needs edits. Offering both at
 * once would bury the useful half.
 */
export function promptSuggestions(pageType: PageType, hasPage: boolean): PromptGroup[] {
  if (!hasPage) {
    return [
      {
        title: "Start from",
        hint: "Fills the box so you can adjust it before generating.",
        prompts: PAGE_STARTERS[pageType] ?? PAGE_STARTERS.landing,
      },
    ];
  }

  return [
    {
      title: "Add a section",
      hint: "Runs straight away and builds on the current page. Undo is one click.",
      prompts: SECTIONS[pageType] ?? SECTIONS.landing,
    },
    {
      title: "Refine the whole page",
      hint: "Rewrites the page around the change, keeping your sections.",
      prompts: REFINEMENTS,
    },
  ];
}

/**
 * How long a brief may be, matching the limit the generator enforces.
 *
 * Kept here so the editor can warn before a long brief is rejected, rather
 * than after the coach has finished writing it.
 */
export const MAX_PROMPT_CHARS = 60000;

export interface BuilderPage {
  id: string;
  coach_id: string;
  title: string;
  slug: string;
  html: string;
  css: string;
  prompt: string | null;
  last_prompt: string | null;
  page_type: PageType;
  service_id: string | null;
  status: "draft" | "published";
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
}

/** URL-safe slug. Falls back rather than producing an empty string. */
export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return slug || "page";
}

/**
 * Whether a string is a complete HTML document rather than a fragment.
 * A fragment needs wrapping before it can be previewed on its own.
 */
export const isFullDocument = (html: string): boolean =>
  /<!doctype html|<html[\s>]/i.test(html);

/** Wraps a fragment so it previews with sensible defaults. */
export function toPreviewDocument(html: string, css = ""): string {
  if (isFullDocument(html)) return html;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#111}
${css}
</style>
</head>
<body>
${html}
</body>
</html>`;
}

export const VIEWPORTS = {
  mobile: { label: "Mobile", width: 390 },
  tablet: { label: "Tablet", width: 768 },
  desktop: { label: "Desktop", width: 1280 },
} as const;

export type ViewportKey = keyof typeof VIEWPORTS;
