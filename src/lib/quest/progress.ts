import { POWER_TOOLS, type PowerTool } from "./powerTools";
import { HANDBOOK_SECTIONS, HANDBOOK_TOTAL } from "./handbook";
import { filledSocials, SOCIALS_REQUIRED_TO_PUBLISH, type SocialMap } from "./socials";

/**
 * Every percentage Quest shows, in one place.
 *
 * These are pure functions over plain data on purpose. The same numbers are
 * rendered in four places — the sidebar card, the gate screen, the command
 * centre grid and the award ladder — and the fastest way to make a progress
 * bar untrustworthy is to compute it slightly differently in each of them.
 */

const percent = (done: number, total: number) =>
  total <= 0 ? 0 : Math.round((done / total) * 100);

// ------------------------------------------------------------- the profile --

export interface ProfileInput {
  fullName?: string | null;
  avatarUrl?: string | null;
  city?: string | null;
  designation?: string | null;
  communityName?: string | null;
  socials?: SocialMap | null;
}

export interface ProfileState {
  percent: number;
  complete: boolean;
  /** Short labels for the "Missing: ..." line on the gate card. */
  missing: string[];
  socialCount: number;
  /** Publishing a story needs the social links whether or not the rest is done. */
  canPublish: boolean;
}

export function profileState(input: ProfileInput): ProfileState {
  const socialCount = filledSocials(input.socials).length;

  const requirements: { label: string; met: boolean }[] = [
    { label: "your name", met: !!input.fullName?.trim() },
    { label: "profile photo", met: !!input.avatarUrl?.trim() },
    { label: "city", met: !!input.city?.trim() },
    { label: "niche/title", met: !!input.designation?.trim() },
    { label: "community name", met: !!input.communityName?.trim() },
    {
      label: `${SOCIALS_REQUIRED_TO_PUBLISH} social profiles`,
      met: socialCount >= SOCIALS_REQUIRED_TO_PUBLISH,
    },
  ];

  const missing = requirements.filter((r) => !r.met).map((r) => r.label);

  return {
    percent: percent(requirements.length - missing.length, requirements.length),
    complete: missing.length === 0,
    missing,
    socialCount,
    canPublish: socialCount >= SOCIALS_REQUIRED_TO_PUBLISH,
  };
}

// ------------------------------------------------------------ the handbook --

export interface HandbookState {
  read: number;
  total: number;
  percent: number;
  complete: boolean;
  /** The first unread section — where "Continue reading" goes. */
  nextKey: string;
}

export function handbookState(readKeys: Iterable<string>): HandbookState {
  const read = new Set(readKeys);
  // Counted against the sections that actually exist, so a stale row for a
  // section that has since been cut cannot push a member past 100%.
  const readCount = HANDBOOK_SECTIONS.filter((s) => read.has(s.key)).length;
  const next = HANDBOOK_SECTIONS.find((s) => !read.has(s.key));

  return {
    read: readCount,
    total: HANDBOOK_TOTAL,
    percent: percent(readCount, HANDBOOK_TOTAL),
    complete: readCount >= HANDBOOK_TOTAL,
    nextKey: next?.key ?? HANDBOOK_SECTIONS[0].key,
  };
}

// ----------------------------------------------------------------- the gate --

export interface GateStep {
  key: "profile" | "handbook";
  percent: number;
  complete: boolean;
}

export interface GateState {
  steps: GateStep[];
  completed: number;
  total: number;
  /** Moves as each step fills in, rather than jumping 0 → 50 → 100. */
  percent: number;
  unlocked: boolean;
}

export function gateState(profile: ProfileState, handbook: HandbookState): GateState {
  const steps: GateStep[] = [
    { key: "profile", percent: profile.percent, complete: profile.complete },
    { key: "handbook", percent: handbook.percent, complete: handbook.complete },
  ];
  const completed = steps.filter((s) => s.complete).length;

  return {
    steps,
    completed,
    total: steps.length,
    percent: Math.round(steps.reduce((sum, s) => sum + s.percent, 0) / steps.length),
    unlocked: completed === steps.length,
  };
}

// ----------------------------------------------------------- the tool chain --

export type ToolStatus = "done" | "next" | "locked";

export interface ToolRun {
  tool_key: string;
  status: string;
  score: number | null;
  summary: string | null;
}

export interface ToolRow {
  tool: PowerTool;
  status: ToolStatus;
  score: number | null;
  summary: string | null;
}

export interface ToolChainState {
  rows: ToolRow[];
  complete: number;
  total: number;
  /** 0-100. Each tool contributes its weight, scaled by its own score. */
  potency: number;
  /** Label for the potency number. */
  label: string;
  /** The row a "Continue" button should open, if there is one. */
  next: ToolRow | null;
}

/**
 * The chain, resolved.
 *
 * Exactly one tool is ever "next": the first unfinished one. Everything after
 * it is locked regardless of what order the member visited things in, which
 * is what keeps the sequence a sequence rather than a suggestion.
 */
export function toolChainState(runs: ToolRun[]): ToolChainState {
  const byKey = new Map(runs.map((r) => [r.tool_key, r]));
  let nextTaken = false;

  const rows: ToolRow[] = POWER_TOOLS.map((tool) => {
    const run = byKey.get(tool.key);
    const done = run?.status === "done";

    let status: ToolStatus;
    if (done) {
      status = "done";
    } else if (!nextTaken) {
      status = "next";
      nextTaken = true;
    } else {
      status = "locked";
    }

    return { tool, status, score: run?.score ?? null, summary: run?.summary ?? null };
  });

  const earned = rows.reduce((sum, row) => {
    if (row.status !== "done") return sum;
    // An unscored tool is worth its full weight once finished; a scored one is
    // worth its weight in proportion to the score it produced.
    const share = row.tool.scored ? (row.score ?? 0) / 100 : 1;
    return sum + row.tool.weight * share;
  }, 0);

  const potency = Math.round(earned);
  const complete = rows.filter((r) => r.status === "done").length;

  return {
    rows,
    complete,
    total: rows.length,
    potency,
    label: potencyLabel(potency),
    next: rows.find((r) => r.status === "next") ?? null,
  };
}

export function potencyLabel(potency: number): string {
  if (potency >= 85) return "Formidable";
  if (potency >= 65) return "Compounding";
  if (potency >= 40) return "Building";
  if (potency >= 15) return "Starting";
  return "Not started";
}

// -------------------------------------------------------- the momentum meter --

export interface MomentumInput {
  gate: GateState;
  currentStreak: number;
  potency: number;
  storiesPublished: number;
  commentsLeft: number;
}

export interface MomentumBand {
  key: string;
  label: string;
  /** Points earned out of `weight`. */
  earned: number;
  weight: number;
  hint: string;
}

export interface MomentumState {
  score: number;
  label: string;
  bands: MomentumBand[];
  /** The band with the most headroom — what to nudge the member towards. */
  weakest: MomentumBand;
}

/** A ceiling on each input, so one maxed-out band cannot hide three empty ones. */
const capped = (value: number, ceiling: number) => Math.min(value / ceiling, 1);

export function momentumMeter(input: MomentumInput): MomentumState {
  const bands: MomentumBand[] = [
    {
      key: "setup",
      label: "Setup",
      weight: 20,
      earned: (input.gate.percent / 100) * 20,
      hint: "Finish your profile and the handbook",
    },
    {
      key: "consistency",
      label: "Consistency",
      weight: 25,
      // Thirty days is where a streak stops being a run of good days.
      earned: capped(input.currentStreak, 30) * 25,
      hint: "Hold your daily ritual streak",
    },
    {
      key: "build",
      label: "Build",
      weight: 35,
      earned: (input.potency / 100) * 35,
      hint: "Work through the Power Tools chain",
    },
    {
      key: "contribution",
      label: "Contribution",
      weight: 20,
      // A published story is worth several comments; both count, neither alone
      // fills the band.
      earned: capped(input.storiesPublished * 3 + input.commentsLeft, 12) * 20,
      hint: "Publish a story, comment on somebody else's",
    },
  ].map((band) => ({ ...band, earned: Math.round(band.earned * 10) / 10 }));

  const score = Math.round(bands.reduce((sum, b) => sum + b.earned, 0));
  const weakest = bands.reduce((worst, b) =>
    b.weight - b.earned > worst.weight - worst.earned ? b : worst,
  );

  return { score, label: potencyLabel(score), bands, weakest };
}
