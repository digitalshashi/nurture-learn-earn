// The frozen skeleton.
//
// These constants are the part of a Freedom Business course that never varies
// between niches, so they live in code rather than in a prompt: they are
// passed into the model as fixed data, and they are what validation compares
// against afterwards. A model that invents a sixteenth video or renames a slot
// has broken the format, and we can tell, because the answer is here.
//
// Kept in sync with supabase/functions/_shared/courseSkeleton.ts — the edge
// function cannot import from src/, and courseSkeleton.test.ts fails the build
// if the two ever drift.

import type { BonusResource, BonusSlot } from "./types";

export interface FoundationSlot {
  slot: number;
  purpose: string;
  step_ref: number | null;
}

/**
 * The fixed running order of the 15 foundation videos.
 *
 * Day 1 sells the system, Day 2 teaches steps 1-3, Day 3 teaches steps 4-6 and
 * asks for the next commitment. The bridge slots at the end of Days 1 and 2 are
 * not filler — a student who knows what tomorrow holds comes back for it.
 */
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

export const FOUNDATION_DAYS: { day: number; theme: string; goal: string }[] = [
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

/** Every bonus is 3 videos in this order, and exactly one download. */
export const BONUS_SLOTS: { slot: BonusSlot; label: string }[] = [
  { slot: "context", label: "Context — why this matters" },
  { slot: "content", label: "Content & Resource — the teaching and the download" },
  { slot: "next", label: "Next Steps — what to do now, and how it links back" },
];

export interface BonusBrief {
  number: number;
  topic: string;
  /** One line on what this bonus is for, used as the default `purpose`. */
  purpose: string;
  context: string;
  content: string;
  next: string;
  resource: BonusResource;
}

/**
 * The six side-courses that support the main skill.
 *
 * They are defaults, not law: a niche that clearly needs a different support
 * can swap one out. But six is fixed, and so is the 3-videos-plus-a-download
 * shape, because the price ladder depends on each bonus being a real,
 * separable piece of value rather than a bag of extra clips.
 */
export const DEFAULT_BONUSES: BonusBrief[] = [
  {
    number: 1,
    topic: "Niche",
    purpose: "Lock in a profitable niche so everything else has a target.",
    context: "why a vague niche kills results",
    content: "the niche-selection method, plus the worksheet",
    next: "validate the niche before building anything on it",
    resource: { name: "Niche Clarity Worksheet", type: "pdf" },
  },
  {
    number: 2,
    topic: "Curriculum",
    purpose: "Plan the content calendar so the work is decided in advance.",
    context: "why a written plan beats motivation",
    content: "how to lay out 30 days, plus the calendar sheet",
    next: "fill in week one today",
    resource: { name: "30-Day Content Calendar", type: "sheet" },
  },
  {
    number: 3,
    topic: "Funnels",
    purpose: "Turn followers and leads into paying customers.",
    context: "what a funnel actually is, in plain words",
    content: "the simple 3-stage funnel, plus the map and the scripts",
    next: "build the first funnel page",
    resource: { name: "Funnel Map + Scripts", type: "pdf" },
  },
  {
    number: 4,
    topic: "Budgeting",
    purpose: "Manage money and any ad spend without guessing.",
    context: "why beginners lose money in the first month",
    content: "the budget system, plus the tracker",
    next: "set this month's numbers",
    resource: { name: "Budget Tracker", type: "sheet" },
  },
  {
    number: 5,
    topic: "AI Strategy",
    purpose: "Use AI across the whole business, not just for writing.",
    context: "where AI genuinely saves time here, and where it does not",
    content: "the working workflow, plus the prompt library",
    next: "automate one task this week",
    resource: { name: "Prompt Library", type: "pdf" },
  },
  {
    number: 6,
    topic: "Coaching",
    purpose: "Get support, and actually use it well.",
    context: "why people waste the coaching access they paid for",
    content: "how to prepare and what to ask, plus the call-prep sheet",
    next: "book and prepare for the first call",
    resource: { name: "Call-Prep & Progress Tracker", type: "sheet" },
  },
];

/**
 * The five rungs of the offer, in the order they are read out.
 *
 * Descriptions are written by the suggestion engine because they name the
 * coach's own topic; only the rungs themselves are fixed.
 */
export const VALUE_STACK_ITEMS = [
  "Challenge",
  "Courses",
  "Coaching",
  "Community",
  "Certification",
] as const;

export const FOUNDATION_VIDEO_COUNT = 5;
export const FOUNDATION_DAY_COUNT = 3;
export const BONUS_COUNT = 6;
export const STEP_COUNT = 6;

/**
 * The Inner Circle Vault, as it starts life on every new course.
 *
 * A weekly call is the default because it is the cadence people can actually
 * hold: monthly is too sparse for momentum and daily is a job. The coach can
 * change any of it, but the vault is created switched on — an offer with no
 * recurring reason to stay is a course rather than a business.
 */
export const DEFAULT_INNER_CIRCLE = {
  name: "Inner Circle Vault",
  call: {
    cadence: "weekly" as const,
    title: "Weekly Inner Circle Call",
  },
  includes: [
    "Replays of every Inner Circle call",
    "The templates and swipe files as they are made",
    "Member wins and teardowns",
    "Direct questions answered on the call",
  ],
};
