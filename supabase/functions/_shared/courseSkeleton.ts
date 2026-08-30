// The frozen course skeleton, edge-side.
//
// A deliberate duplicate of src/lib/courseEngine/slots.ts. Deno functions
// cannot import from src/, and the slot table has to exist on both sides: the
// app validates against it, and the prompts pass it to the model as fixed data
// so the model is never asked to invent a running order.
//
// The duplication is guarded, not tolerated — src/lib/courseEngine/skeletonSync.test.ts
// compares the two files and fails the build if they drift. If you edit one,
// edit the other.

export interface FoundationSlot {
  slot: number;
  purpose: string;
  step_ref: number | null;
}

export const FOUNDATION_SLOTS: Record<number, FoundationSlot[]> = {
  1: [
    { slot: 1, purpose: "Welcome & Orientation (Context)", step_ref: null },
    { slot: 2, purpose: "The 6-Step Model (Vehicle)", step_ref: null },
    { slot: 3, purpose: "Self-Discovery Assignment", step_ref: null },
    { slot: 4, purpose: "Goal Setting & Mindset", step_ref: null },
    { slot: 5, purpose: "What to Expect on Day 2 (Bridge)", step_ref: null },
  ],
  2: [
    { slot: 1, purpose: "Skills Required to Succeed", step_ref: null },
    { slot: 2, purpose: "Step 1 (Tools & Templates)", step_ref: 1 },
    { slot: 3, purpose: "Step 2 (Tools & Templates)", step_ref: 2 },
    { slot: 4, purpose: "Step 3 (Tools & Templates)", step_ref: 3 },
    { slot: 5, purpose: "What to Expect on Day 3 (Bridge)", step_ref: null },
  ],
  3: [
    { slot: 1, purpose: "Step 4 (Tools & Templates)", step_ref: 4 },
    { slot: 2, purpose: "Step 5 (Tools & Templates)", step_ref: 5 },
    { slot: 3, purpose: "Step 6 (Tools & Templates)", step_ref: 6 },
    { slot: 4, purpose: "Your Journey Ahead (Mirror & Path)", step_ref: null },
    { slot: 5, purpose: "Connect the Dots — Next Step (CTA)", step_ref: null },
  ],
};

export const FOUNDATION_DAYS = [
  {
    day: 1,
    theme: "Foundation & Belief Building",
    goal: "Welcome them, show what is possible, and make them believe the 6-step system works.",
  },
  {
    day: 2,
    theme: "Skills & Steps 1-3",
    goal: "Explain the skills, then teach the first three steps with the tools and templates.",
  },
  {
    day: 3,
    theme: "Steps 4-6 & The Next Level",
    goal: "Finish the system, show them how far it goes, and point at the next step.",
  },
];

export const DEFAULT_BONUSES = [
  { number: 1, topic: "Niche", resource: "Niche Clarity Worksheet", type: "pdf" },
  { number: 2, topic: "Curriculum", resource: "30-Day Content Calendar", type: "sheet" },
  { number: 3, topic: "Funnels", resource: "Funnel Map + Scripts", type: "pdf" },
  { number: 4, topic: "Budgeting", resource: "Budget Tracker", type: "sheet" },
  { number: 5, topic: "AI Strategy", resource: "Prompt Library", type: "pdf" },
  { number: 6, topic: "Coaching", resource: "Call-Prep & Progress Tracker", type: "sheet" },
];

export const STEP_COUNT = 6;

/** Words in a step name, ignoring connectors like "&" that carry no meaning. */
export function wordCount(name: string): number {
  return name
    .trim()
    .split(/\s+/)
    .filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

export interface Step {
  number: number;
  name: string;
  achievement: string;
}

/**
 * The six-step rules, checked here rather than hoped for in the prompt.
 *
 * Returns the reasons it failed, which the retry appends to the next attempt —
 * telling the model precisely what it got wrong is worth far more than asking
 * it again in the same words.
 */
export function checkSteps(steps: Step[]): string[] {
  const problems: string[] = [];

  if (steps.length !== STEP_COUNT) {
    problems.push(`Returned ${steps.length} steps; exactly ${STEP_COUNT} are required.`);
  }

  const numbers = steps.map((step) => step.number);
  const expected = Array.from({ length: STEP_COUNT }, (_, i) => i + 1);
  if (new Set(numbers).size !== numbers.length || !expected.every((n) => numbers.includes(n))) {
    problems.push("Steps must be numbered 1 to 6, each exactly once.");
  }

  for (const step of steps) {
    if (!step.name?.trim()) {
      problems.push(`Step ${step.number} has no name.`);
      continue;
    }
    const words = wordCount(step.name);
    if (words < 2 || words > 4) {
      problems.push(`Step name "${step.name}" is ${words} words; names must be 2 to 4 plain words.`);
    }
    if (!step.achievement?.trim()) {
      problems.push(`Step ${step.number} ("${step.name}") has no achievement.`);
    }
  }

  return problems;
}

/** The slot table as the prompt sees it: fixed data, not a suggestion. */
export function slotTableForPrompt(): string {
  return FOUNDATION_DAYS.map(({ day, theme }) => {
    const rows = FOUNDATION_SLOTS[day]
      .map((slot) => `  slot ${slot.slot}: ${slot.purpose}${slot.step_ref ? ` [teaches step ${slot.step_ref}]` : ""}`)
      .join("\n");
    return `Day ${day} — ${theme}\n${rows}`;
  }).join("\n\n");
}
