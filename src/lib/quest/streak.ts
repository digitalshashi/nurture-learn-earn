/**
 * Streak arithmetic, kept away from the component that renders it.
 *
 * The rule that matters: a streak advances only on the day *after* the last
 * completed one. Anything else — a gap, or a second completion on the same
 * day — either resets it or leaves it alone, and getting that wrong is how a
 * member ends up with a 40-day streak they did not earn.
 */

export interface StreakRow {
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
}

export interface StreakResult {
  current: number;
  longest: number;
  /** False when the day was already counted, so nothing should be written. */
  changed: boolean;
  /** Set when this completion landed exactly on a milestone. */
  milestone: StreakMilestone | null;
}

export interface StreakMilestone {
  days: number;
  name: string;
  xp: number;
  blurb: string;
}

/** The rungs, in order. `nextMilestone` walks this list. */
export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 7, name: "Week Warrior", xp: 50, blurb: "Seven days without a gap" },
  { days: 30, name: "Month Maker", xp: 200, blurb: "A full month of showing up" },
  { days: 90, name: "Quarter Champion", xp: 500, blurb: "Ninety days — this is a habit now" },
  { days: 365, name: "Year of Showing Up", xp: 2000, blurb: "A year. Almost nobody gets here" },
];

/** The name for the streak a member is currently on. */
export function streakTitle(current: number): string {
  if (current === 0) return "Not started";
  const held = STREAK_MILESTONES.filter((m) => current >= m.days);
  return held.length > 0 ? held[held.length - 1].name : "Building Momentum";
}

export function nextMilestone(current: number): StreakMilestone | null {
  return STREAK_MILESTONES.find((m) => m.days > current) ?? null;
}

/** ISO date (YYYY-MM-DD) for a day offset from another ISO date, in local time. */
export function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * What the streak becomes when every ritual is finished on `today`.
 *
 * `row` is null for a member who has never completed a day.
 */
export function advanceStreak(row: StreakRow | null, today: string): StreakResult {
  if (!row) {
    return { current: 1, longest: 1, changed: true, milestone: milestoneAt(1) };
  }

  // Already counted today. Ticking the last ritual twice — two tabs, a double
  // click — must not add a day.
  if (row.last_completed_date === today) {
    return {
      current: row.current_streak,
      longest: row.longest_streak,
      changed: false,
      milestone: null,
    };
  }

  const continued = row.last_completed_date === shiftDate(today, -1);
  const current = continued ? row.current_streak + 1 : 1;

  return {
    current,
    longest: Math.max(current, row.longest_streak),
    changed: true,
    milestone: milestoneAt(current),
  };
}

const milestoneAt = (days: number) => STREAK_MILESTONES.find((m) => m.days === days) ?? null;

/**
 * The seven cells of the weekly grid, Monday first.
 *
 * A cell is filled when that day falls inside the run that ends today, which
 * is why this takes the streak length rather than a list of dates: the run is
 * contiguous by definition, so its length is all the information there is.
 */
export function weekCells(
  current: number,
  today: Date,
  doneToday: boolean,
): { label: string; filled: boolean; isToday: boolean }[] {
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  // getDay() is Sunday-first; the grid is Monday-first.
  const todayIndex = (today.getDay() + 6) % 7;

  return labels.map((label, index) => {
    const daysBack = todayIndex - index;
    const filled =
      daysBack === 0
        ? doneToday
        : // Yesterday is 1 day back and is covered when the streak is at least
          // 1 (excluding today, which has not been counted into it yet).
          daysBack > 0 && daysBack <= current - (doneToday ? 1 : 0);
    return { label, filled, isToday: daysBack === 0 };
  });
}
