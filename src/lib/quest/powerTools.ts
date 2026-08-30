import {
  Fingerprint,
  Compass,
  UserRoundCheck,
  Blocks,
  Gauge,
  Clapperboard,
  Youtube,
  type LucideIcon,
} from "lucide-react";

/**
 * The seven Power Tools, in the order they unlock.
 *
 * Each tool is a short guided form that produces a document. That is the
 * whole mechanic — there is no cleverness behind them, and there does not
 * need to be: the value is in a member having actually written the answers
 * down once, in order, where they can re-read them.
 *
 * The chain is strictly sequential and the lock is derived, never stored (see
 * `toolChainState`). Re-ordering this array therefore re-orders the chain for
 * everyone without stranding anybody behind a step that moved.
 */

export type ToolFieldType = "text" | "textarea" | "scale";

export interface ToolField {
  key: string;
  label: string;
  type: ToolFieldType;
  placeholder?: string;
  help?: string;
}

export interface PowerTool {
  key: string;
  name: string;
  /** The one line under the name in the chain. */
  tagline: string;
  icon: LucideIcon;
  /** Minutes, honestly estimated. Members budget against this. */
  minutes: number;
  /** This tool's share of the 100-point Business Potency score. */
  weight: number;
  fields: ToolField[];
  /**
   * Tools that produce a number of their own. Everything else counts as a
   * flat 100 once finished — a codex is done or it is not, it does not have
   * a quality score, and inventing one would be a lie dressed as a metric.
   */
  scored?: boolean;
  /** The line the chain row shows once the tool is done. */
  summarize: (answers: ToolAnswers, score: number | null) => string;
}

export type ToolAnswers = Record<string, string>;

/** A 1-10 self-rating. Rendered as a row of buttons, stored as a string. */
const scale = (key: string, label: string, help?: string): ToolField => ({
  key,
  label,
  type: "scale",
  help,
});

export const POWER_TOOLS: PowerTool[] = [
  {
    key: "personal-codex",
    name: "Personal Codex",
    tagline: "Define who you are — your values, your voice and your perfect day.",
    icon: Fingerprint,
    minutes: 20,
    weight: 18,
    fields: [
      {
        key: "values",
        label: "The three values you will not trade",
        type: "textarea",
        placeholder: "One per line. Not aspirations — the ones you already refuse to break.",
        help: "If you have never turned down money over one of these, it is not on the list yet.",
      },
      {
        key: "voice",
        label: "How you sound when you are not performing",
        type: "textarea",
        placeholder: "Blunt and warm. Short sentences. Allergic to jargon.",
      },
      {
        key: "perfect_day",
        label: "Your perfect working day, hour by hour",
        type: "textarea",
        placeholder: "06:30 up, 07:00 write, 09:00 calls until 12:00...",
        help: "Be specific about the hours. A vague answer here makes every later tool vague too.",
      },
      {
        key: "refuse",
        label: "What you are building this so you never have to do again",
        type: "text",
        placeholder: "Sit in someone else's status meeting",
      },
    ],
    summarize: (a) => {
      const first = (a.values || "").split("\n").map((v) => v.trim()).filter(Boolean)[0];
      return first ? `Anchor value: ${first}` : "Codex written";
    },
  },
  {
    key: "niche-finder",
    name: "Niche Finder",
    tagline: "Discover the market you were built to serve.",
    icon: Compass,
    minutes: 25,
    weight: 16,
    fields: [
      {
        key: "who",
        label: "Who, specifically",
        type: "text",
        placeholder: "Second-year physiotherapists running a solo clinic",
        help: "If your answer would fit more than a few hundred thousand people, narrow it once more.",
      },
      {
        key: "problem",
        label: "The problem they would pay to make go away today",
        type: "textarea",
        placeholder: "Fully booked and still not profitable, with no idea which service is losing money.",
      },
      {
        key: "proof",
        label: "Why you, and not somebody else",
        type: "textarea",
        placeholder: "You spent six years in that exact seat and fixed it for your own clinic.",
      },
      {
        key: "where",
        label: "Where they already gather",
        type: "text",
        placeholder: "Two subreddits, one LinkedIn group, a conference each March",
      },
    ],
    summarize: (a) => (a.who ? `Serving: ${a.who}` : "Niche defined"),
  },
  {
    key: "coach-persona",
    name: "Coach Persona",
    tagline: "Pin down how you show up in front of that market.",
    icon: UserRoundCheck,
    minutes: 15,
    weight: 14,
    fields: [
      {
        key: "designation",
        label: "What you call yourself in one line",
        type: "text",
        placeholder: "Clinic profitability coach for solo physios",
      },
      {
        key: "promise",
        label: "The promise you make in public",
        type: "textarea",
        placeholder: "You will know which of your services makes money within thirty days.",
      },
      {
        key: "stance",
        label: "The thing you say that your market argues with",
        type: "textarea",
        placeholder: "More patients is almost never the answer.",
        help: "A persona with no edge is invisible. Pick the position you can defend for a year.",
      },
    ],
    summarize: (a) => (a.designation ? a.designation : "Persona set"),
  },
  {
    key: "business-codex",
    name: "Business Codex",
    tagline: "Build the full blueprint — the offer, the price and the path to it.",
    icon: Blocks,
    minutes: 40,
    weight: 20,
    fields: [
      {
        key: "offer",
        label: "The offer, in one sentence",
        type: "textarea",
        placeholder: "A six-week programme that rebuilds a solo clinic's service mix around margin.",
      },
      {
        key: "price",
        label: "Price, and why that number",
        type: "text",
        placeholder: "₹60,000 — roughly one month of the margin it recovers",
      },
      {
        key: "path",
        label: "The path a stranger walks to buy it",
        type: "textarea",
        placeholder: "Short video → free margin calculator → email sequence → call → offer",
        help: "Every step a real person actually takes. If you cannot name the step, it does not exist.",
      },
      {
        key: "delivery",
        label: "How it gets delivered without you doing everything twice",
        type: "textarea",
        placeholder: "Recorded lessons for the theory, weekly live call for the arguing.",
      },
      {
        key: "first_ten",
        label: "Where the first ten buyers come from",
        type: "textarea",
        placeholder: "Name them. Actual names.",
      },
    ],
    summarize: (a) => (a.price ? `Offer priced at ${a.price}` : "Blueprint written"),
  },
  {
    key: "skills-scorecard",
    name: "Skills Scorecard",
    tagline: "An honest rating of the seven skills that move the number.",
    icon: Gauge,
    minutes: 10,
    weight: 12,
    scored: true,
    fields: [
      scale("writing", "Writing", "Can you make a stranger keep reading?"),
      scale("speaking", "Speaking on camera", "Comfortable, not polished."),
      scale("offer", "Offer design", "Turning a problem into something priced."),
      scale("selling", "Selling one to one", "Conversations that end in a decision."),
      scale("delivery", "Delivery", "People actually get the result."),
      scale("systems", "Systems and tooling", "It runs when you are asleep."),
      scale("consistency", "Consistency", "You do it on the bad weeks too."),
    ],
    summarize: (_a, score) => `Latest overall score: ${score ?? 0}/100`,
  },
  {
    key: "short-form-challenge",
    name: "Short-Form Challenge",
    tagline: "Thirty short videos around one topic, planned in one sitting.",
    icon: Clapperboard,
    minutes: 30,
    weight: 10,
    fields: [
      {
        key: "topic",
        label: "The one core topic",
        type: "text",
        placeholder: "Clinic margin",
        help: "One. Thirty videos on one topic beats thirty on thirty.",
      },
      {
        key: "hooks",
        label: "Ten hooks you would stop scrolling for",
        type: "textarea",
        placeholder: "One per line.",
      },
      {
        key: "cadence",
        label: "Your posting cadence, and the day you batch",
        type: "text",
        placeholder: "Five a week, batched Sunday morning",
      },
    ],
    summarize: (a) => (a.topic ? `Core topic: ${a.topic}` : "Challenge planned"),
  },
  {
    key: "long-form-codex",
    name: "Long-Form Codex",
    tagline: "A year of long videos — 104 of them, engineered rather than improvised.",
    icon: Youtube,
    minutes: 45,
    weight: 10,
    fields: [
      {
        key: "pillars",
        label: "Your four content pillars",
        type: "textarea",
        placeholder: "One per line. Twenty-six videos will come out of each.",
      },
      {
        key: "series",
        label: "The one series you would be known for",
        type: "text",
        placeholder: "Teardown Tuesdays — one real clinic's numbers per week",
      },
      {
        key: "first_ten",
        label: "The first ten titles",
        type: "textarea",
        placeholder: "One per line. Titles, not topics.",
      },
      {
        key: "commitment",
        label: "Two per week, on which days",
        type: "text",
        placeholder: "Tuesday and Friday, 7am",
      },
    ],
    summarize: (a) => (a.series ? `Flagship series: ${a.series}` : "Year planned"),
  },
];

export const toolByKey = (key: string) => POWER_TOOLS.find((t) => t.key === key);

/** A scale field with nothing chosen yet reads as zero, not as one. */
export function scorecardScore(answers: ToolAnswers, tool: PowerTool): number {
  const scales = tool.fields.filter((f) => f.type === "scale");
  if (scales.length === 0) return 100;
  const total = scales.reduce((sum, f) => sum + (Number(answers[f.key]) || 0), 0);
  return Math.round((total / (scales.length * 10)) * 100);
}

/** Required-field completeness, used to decide whether "Finish" is allowed. */
export function toolIsAnswered(tool: PowerTool, answers: ToolAnswers): boolean {
  return tool.fields.every((f) => (answers[f.key] || "").trim().length > 0);
}

/** The downloadable artefact. Plain text on purpose — it has to outlive us. */
export function toolExport(
  tool: PowerTool,
  answers: ToolAnswers,
  memberName: string,
  completedAt: Date,
): string {
  const rule = "=".repeat(60);
  const lines = [
    rule,
    tool.name.toUpperCase(),
    tool.tagline,
    rule,
    `Member:    ${memberName}`,
    `Completed: ${completedAt.toLocaleDateString()}`,
    "",
  ];

  for (const field of tool.fields) {
    const value = (answers[field.key] || "").trim() || "—";
    lines.push(field.type === "scale" ? `${field.label}: ${value}/10` : field.label.toUpperCase());
    if (field.type !== "scale") {
      lines.push("-".repeat(field.label.length));
      lines.push(value, "");
    }
  }

  return lines.join("\n");
}
