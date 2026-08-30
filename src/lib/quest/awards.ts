import { Footprints, Flame, PenLine, Wrench, Trophy, Gem, Crown, type LucideIcon } from "lucide-react";

/**
 * The award ladder.
 *
 * Two kinds of rung, and the difference is the whole design. A rung the
 * platform can verify unlocks itself the moment the condition is true. A rung
 * that rests on a number only the member can see — revenue — is applied for
 * and reviewed by a person, because a self-declared milestone nobody checks
 * is worth nothing to the member standing next to them.
 *
 * Locked rungs are never hidden. Seeing what the next one asks for is most of
 * what makes a ladder a ladder.
 */

export interface AwardContext {
  /** Both gate steps cleared. */
  gateComplete: boolean;
  longestStreak: number;
  storiesPublished: number;
  toolsComplete: number;
  totalTools: number;
}

export interface QuestAward {
  key: string;
  title: string;
  icon: LucideIcon;
  /** One line saying what this rung is for. */
  requirement: string;
  /** Spelled-out threshold for the numeric rungs, shown under the requirement. */
  threshold?: string;
  /**
   * "auto" unlocks itself from `met`. "apply" needs a human: `met` decides
   * only whether the Apply button is offered at all.
   */
  kind: "auto" | "apply";
  /** The rung directly below, which has to be held first. */
  requires?: string;
  met: (ctx: AwardContext) => boolean;
  /** Hue for the medal, as an HSL triplet. */
  hue: string;
}

export const QUEST_AWARDS: QuestAward[] = [
  {
    key: "ground-zero",
    title: "Ground Zero",
    icon: Footprints,
    requirement: "Finish your profile and read the handbook",
    kind: "auto",
    hue: "220 14% 46%",
    met: (c) => c.gateComplete,
  },
  {
    key: "ritual-keeper",
    title: "Ritual Keeper",
    icon: Flame,
    requirement: "Hold a seven-day ritual streak",
    threshold: "7 consecutive days, all seven rituals",
    kind: "auto",
    requires: "ground-zero",
    hue: "25 95% 53%",
    met: (c) => c.longestStreak >= 7,
  },
  {
    key: "storyteller",
    title: "Storyteller",
    icon: PenLine,
    requirement: "Publish your first story to the community",
    kind: "auto",
    requires: "ground-zero",
    hue: "200 80% 50%",
    met: (c) => c.storiesPublished >= 1,
  },
  {
    key: "toolsmith",
    title: "Toolsmith",
    icon: Wrench,
    requirement: "Complete every tool in the Power Tools chain",
    threshold: "All 7 tools finished",
    kind: "auto",
    requires: "ritual-keeper",
    hue: "160 60% 40%",
    met: (c) => c.totalTools > 0 && c.toolsComplete >= c.totalTools,
  },
  {
    key: "hall-of-fame",
    title: "Hall of Fame",
    icon: Trophy,
    requirement: "Cross your first ₹3 Lakhs earned from what you built here",
    threshold: "₹3,00,000+ (or the equivalent in your currency)",
    kind: "apply",
    requires: "toolsmith",
    hue: "45 93% 47%",
    // The chain has to be finished before the claim is worth reviewing: an
    // application from somebody who has not written their offer down is a
    // review nobody can complete.
    met: (c) => c.totalTools > 0 && c.toolsComplete >= c.totalTools,
  },
  {
    key: "crore-champion",
    title: "1 Crore Champion",
    icon: Gem,
    requirement: "Cross the ₹1 Crore revenue milestone",
    threshold: "₹1,00,00,000+",
    kind: "apply",
    requires: "hall-of-fame",
    hue: "280 70% 55%",
    met: () => true,
  },
  {
    key: "ten-crore-champion",
    title: "10 Crore Champion",
    icon: Crown,
    requirement: "Cross the ₹10 Crore revenue milestone",
    threshold: "₹10,00,00,000+ · hold 1 Crore Champion first",
    kind: "apply",
    requires: "crore-champion",
    hue: "340 75% 55%",
    met: () => true,
  },
];

export type AwardStatus = "achieved" | "pending" | "apply" | "locked";

export interface AwardRow {
  award: QuestAward;
  status: AwardStatus;
  /** Why it is locked, when it is. */
  blockedBy?: string;
}

/**
 * The ladder as the member sees it.
 *
 * Walked in order so a rung can look at the one below: `requires` is checked
 * against the *resolved* status of the previous rung rather than against the
 * raw condition, which is what makes "achieve 1 Crore Champion first" true
 * rather than decorative.
 */
export function awardLadder(
  ctx: AwardContext,
  applications: Record<string, "pending" | "approved" | "rejected">,
): AwardRow[] {
  const resolved = new Map<string, AwardStatus>();

  return QUEST_AWARDS.map((award) => {
    const application = applications[award.key];
    const prerequisiteHeld = !award.requires || resolved.get(award.requires) === "achieved";

    let status: AwardStatus;
    let blockedBy: string | undefined;

    if (application === "approved") {
      status = "achieved";
    } else if (!prerequisiteHeld) {
      status = "locked";
      blockedBy = QUEST_AWARDS.find((a) => a.key === award.requires)?.title;
    } else if (application === "pending") {
      status = "pending";
    } else if (award.kind === "auto") {
      status = award.met(ctx) ? "achieved" : "locked";
    } else {
      // An "apply" rung whose gate is not met yet reads as locked, not as an
      // invitation to send in a claim that will only be turned down.
      status = award.met(ctx) ? "apply" : "locked";
    }

    resolved.set(award.key, status);
    return { award, status, blockedBy };
  });
}

/** The highest rung actually held, for the "Current level" line. */
export function currentAwardLevel(rows: AwardRow[]): QuestAward | null {
  const held = rows.filter((r) => r.status === "achieved");
  return held.length > 0 ? held[held.length - 1].award : null;
}
