/**
 * Drip scheduling — deciding which sections a learner can open yet.
 *
 * The Drip tab has always written `courses.drip_type` and the per-section
 * `drip_delay_days` / `drip_date`, but nothing on the learner's side read
 * them back, so a schedule a coach set up did nothing at all. Both places
 * that show a curriculum — the landing page and the player — ask this module,
 * so they cannot disagree about what is open.
 */

export type DripType = "none" | "enrollment" | "date" | "completion";

export interface DripSection {
  id: string;
  title?: string | null;
  chapters: { id: string }[];
  drip_delay_days?: number | null;
  drip_date?: string | null;
}

export interface DripLock {
  locked: boolean;
  /** A sentence for the badge on a locked section. Absent when unlocked. */
  reason?: string;
  /** When it opens, for the schedule-based types. */
  unlocksAt?: Date;
}

export interface DripInput {
  dripType: string | null | undefined;
  sections: DripSection[];
  /** ISO timestamp of the learner's enrolment, when there is one. */
  enrolledAt?: string | null;
  completedChapterIds: Set<string>;
  /** Coaches and admins see the whole course regardless of the schedule. */
  bypass?: boolean;
  /** Injected so the behaviour is testable. */
  now?: Date;
}

const UNLOCKED: DripLock = { locked: false };

function formatDay(date: Date): string {
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function daysUntil(target: Date, now: Date): number {
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

/**
 * @returns a lock state per section id. Sections absent from the map are open.
 */
export function computeDripLocks({
  dripType,
  sections,
  enrolledAt,
  completedChapterIds,
  bypass = false,
  now = new Date(),
}: DripInput): Map<string, DripLock> {
  const locks = new Map<string, DripLock>();
  const type = (dripType || "none") as DripType;

  if (bypass || type === "none") {
    sections.forEach((s) => locks.set(s.id, UNLOCKED));
    return locks;
  }

  if (type === "completion") {
    // The first section is always open; each later one waits on every lesson
    // above it. A section with no lessons cannot gate anything, so it passes
    // through rather than deadlocking the rest of the course.
    let blockedBy: string | null = null;
    sections.forEach((section) => {
      if (blockedBy === null) {
        locks.set(section.id, UNLOCKED);
      } else {
        locks.set(section.id, { locked: true, reason: `Finish "${blockedBy}" to unlock` });
      }
      const unfinished = section.chapters.some((c) => !completedChapterIds.has(c.id));
      if (unfinished && blockedBy === null) {
        blockedBy = section.title?.trim() || "the previous section";
      }
    });
    return locks;
  }

  if (type === "date") {
    sections.forEach((section) => {
      if (!section.drip_date) {
        locks.set(section.id, UNLOCKED);
        return;
      }
      // A `date` column has no time; it opens at the start of that day locally.
      const target = new Date(`${section.drip_date}T00:00:00`);
      if (Number.isNaN(target.getTime()) || target <= now) {
        locks.set(section.id, UNLOCKED);
        return;
      }
      locks.set(section.id, {
        locked: true,
        reason: `Unlocks ${formatDay(target)}`,
        unlocksAt: target,
      });
    });
    return locks;
  }

  // type === "enrollment"
  const enrolled = enrolledAt ? new Date(enrolledAt) : null;
  sections.forEach((section) => {
    const delay = section.drip_delay_days || 0;
    // Without an enrolment date there is no clock to count from. Locking on a
    // guess would shut out anyone whose enrolment row we could not read, so
    // the schedule simply does not apply to them.
    if (delay <= 0 || !enrolled || Number.isNaN(enrolled.getTime())) {
      locks.set(section.id, UNLOCKED);
      return;
    }
    const target = new Date(enrolled.getTime() + delay * 86_400_000);
    if (target <= now) {
      locks.set(section.id, UNLOCKED);
      return;
    }
    const remaining = daysUntil(target, now);
    locks.set(section.id, {
      locked: true,
      reason: remaining <= 1 ? "Unlocks tomorrow" : `Unlocks in ${remaining} days`,
      unlocksAt: target,
    });
  });
  return locks;
}

/** Convenience for the many places that only hold a chapter id. */
export function lockedChapterIds(sections: DripSection[], locks: Map<string, DripLock>): Set<string> {
  const ids = new Set<string>();
  sections.forEach((s) => {
    if (locks.get(s.id)?.locked) s.chapters.forEach((c) => ids.add(c.id));
  });
  return ids;
}
