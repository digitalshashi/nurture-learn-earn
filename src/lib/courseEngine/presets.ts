// Deriving the six transformation steps without a model call.
//
// Choosing the six steps is the only genuinely creative decision in the whole
// format — everything else is slot-filling. The AI mode spends its best call
// on it. Formula and manual modes cannot, so they match the topic against a
// library of step sets that are already known to work, and fall back to a
// generic spine that reads sensibly for any skill-to-income course.
//
// A matched preset is a starting point, never an answer: the coach edits the
// six steps at the approval checkpoint before anything downstream is built.

import type { CourseInput, TransformationStep } from "./types";

export interface StepPreset {
  id: string;
  label: string;
  /** Lowercase substrings; any hit scores the preset. */
  keywords: string[];
  steps: { name: string; achievement: string }[];
}

/**
 * Step sets for the niches this platform actually sells into.
 *
 * Names are 2-4 plain words on purpose. "Advanced Algorithmic Content
 * Distribution Systems" is not a step a student can tell you they finished;
 * "Content Strategy" is.
 */
export const STEP_PRESETS: StepPreset[] = [
  {
    id: "instagram",
    label: "Social content creation",
    keywords: ["instagram", "reels", "content creat", "youtube", "social media", "short form", "creator"],
    steps: [
      { name: "Niche & Profile Setup", achievement: "A profile that says who it is for and what it gives, in one look." },
      { name: "Content Strategy & Algorithm", achievement: "A repeatable posting plan built around what the platform actually rewards." },
      { name: "Scripting & Storytelling", achievement: "Hooks and scripts that hold attention past the first three seconds." },
      { name: "Shooting & Editing", achievement: "Footage shot and cut to a watchable standard on a phone." },
      { name: "AI Content & Automation", achievement: "A week of content produced in an afternoon." },
      { name: "Monetization & Offers", achievement: "The first paid offer attached to the audience." },
    ],
  },
  {
    id: "fitness",
    label: "Fat loss and fitness",
    keywords: [
      "fat loss",
      "belly fat",
      "weight loss",
      "lose weight",
      "fitness",
      "workout",
      "gym",
      "muscle",
      "yoga",
      "nutrition",
      "diet",
      "health",
    ],
    steps: [
      { name: "Goal & Body Assessment", achievement: "An honest starting point: measurements, habits and one clear target." },
      { name: "Nutrition Basics", achievement: "A daily way of eating they can keep without counting everything." },
      { name: "Simple Home Workouts", achievement: "A training routine that fits the week they actually have." },
      { name: "Habits & Routine", achievement: "Sleep, steps and meals running on autopilot instead of willpower." },
      { name: "Tracking & Adjusting", achievement: "The skill of reading their own numbers and changing one thing at a time." },
      { name: "Long-Term Maintenance", achievement: "The result held for months after the programme ends." },
    ],
  },
  {
    id: "finance",
    label: "Personal finance",
    keywords: ["personal finance", "money", "budget", "saving", "debt", "wealth", "financial"],
    steps: [
      { name: "Money Mindset & Audit", achievement: "Every rupee in and out of their life written down for the first time." },
      { name: "Budgeting System", achievement: "A budget that survives a real month." },
      { name: "Killing Debt", achievement: "A dated payoff plan with the first debt cleared." },
      { name: "Saving & Emergency Fund", achievement: "Months of expenses set aside and untouchable." },
      { name: "Beginner Investing", achievement: "The first investment made, understood and automated." },
      { name: "Growing & Protecting Wealth", achievement: "Insurance, tax and compounding working together." },
    ],
  },
  {
    id: "freelance",
    label: "Freelance and services",
    keywords: ["freelance", "freelancing", "agency", "client", "service business", "consulting"],
    steps: [
      { name: "Profitable Skill & Niche", achievement: "One skill and one buyer chosen and committed to." },
      { name: "Portfolio & Profile", achievement: "Proof of work a stranger can judge in thirty seconds." },
      { name: "Finding Clients", achievement: "A daily routine that puts them in front of buyers." },
      { name: "Pitching & Closing", achievement: "The first paid project signed." },
      { name: "Delivery & Systems", achievement: "Work delivered on time without living inside it." },
      { name: "Scaling & Raising Rates", achievement: "Higher rates charged and accepted." },
    ],
  },
  {
    id: "trading",
    label: "Trading and markets",
    keywords: ["trading", "stock market", "intraday", "options", "forex", "crypto", "investing"],
    steps: [
      { name: "Market Basics & Setup", achievement: "An account, a platform and the vocabulary to use both." },
      { name: "Charting & Analysis", achievement: "A chart read the same way twice." },
      { name: "Strategy & Backtesting", achievement: "One written strategy tested against past data." },
      { name: "Risk & Position Sizing", achievement: "A maximum loss per trade they never breach." },
      { name: "Psychology & Discipline", achievement: "A trading journal and the habit of following the plan." },
      { name: "Scaling The Account", achievement: "Size increased only against a track record." },
    ],
  },
  {
    id: "english",
    label: "Spoken English",
    keywords: ["spoken english", "english speaking", "communication skill", "fluency", "accent"],
    steps: [
      { name: "Sounds & Pronunciation", achievement: "The sounds their first language does not have, said correctly." },
      { name: "Core Grammar Fixes", achievement: "The handful of mistakes that mark a beginner, gone." },
      { name: "Everyday Vocabulary", achievement: "The words an ordinary day needs, available without translating." },
      { name: "Listening & Comprehension", achievement: "Native-speed speech followed without subtitles." },
      { name: "Speaking Without Fear", achievement: "A conversation held with a stranger." },
      { name: "Fluency & Interviews", achievement: "An interview answered in English with a straight back." },
    ],
  },
];

/**
 * The spine used when nothing matches.
 *
 * Deliberately abstract: it is the shape every skill-to-income transformation
 * takes, so it gives the coach something correct to edit rather than something
 * wrong to delete.
 */
export const GENERIC_STEPS: { name: string; achievement: string }[] = [
  { name: "Foundation & Clarity", achievement: "A clear starting point and one decided outcome." },
  { name: "Core Skill Basics", achievement: "The fundamental skill practised to a usable level." },
  { name: "Build Your System", achievement: "A repeatable process instead of one-off effort." },
  { name: "Reach & Visibility", achievement: "The work put in front of the people it is for." },
  { name: "Convert & Deliver", achievement: "The first real result produced end to end." },
  { name: "Scale & Sustain", achievement: "The result repeated without burning out." },
];

/** The preset whose keywords the inputs hit hardest, or null for none. */
export function matchPreset(input: Pick<CourseInput, "topic" | "audience">): StepPreset | null {
  const haystack = `${input.topic} ${input.audience}`.toLowerCase();
  let best: { preset: StepPreset; hits: number } | null = null;

  for (const preset of STEP_PRESETS) {
    const hits = preset.keywords.filter((keyword) => haystack.includes(keyword)).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { preset, hits };
  }

  return best?.preset ?? null;
}

/**
 * Six numbered steps for these inputs, without calling a model.
 *
 * Used directly by formula mode, offered as the pre-filled starting point in
 * manual mode, and used as the fallback when an AI derivation fails twice.
 */
export function deriveStepsFromTopic(
  input: Pick<CourseInput, "topic" | "audience">,
): TransformationStep[] {
  const source = matchPreset(input)?.steps ?? GENERIC_STEPS;
  return source.map((step, index) => ({ number: index + 1, ...step }));
}
