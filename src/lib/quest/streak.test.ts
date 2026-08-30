import { describe, it, expect } from "vitest";
import {
  advanceStreak,
  nextMilestone,
  shiftDate,
  streakTitle,
  weekCells,
  type StreakRow,
} from "./streak";

const row = (over: Partial<StreakRow> = {}): StreakRow => ({
  current_streak: 3,
  longest_streak: 9,
  last_completed_date: "2026-08-29",
  ...over,
});

describe("shiftDate", () => {
  it("steps back across a month boundary", () => {
    expect(shiftDate("2026-09-01", -1)).toBe("2026-08-31");
  });

  it("steps back across a year boundary", () => {
    expect(shiftDate("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("handles a leap day", () => {
    expect(shiftDate("2028-03-01", -1)).toBe("2028-02-29");
  });
});

describe("advanceStreak", () => {
  it("starts a member's first streak at one", () => {
    const result = advanceStreak(null, "2026-08-30");
    expect(result).toMatchObject({ current: 1, longest: 1, changed: true });
  });

  it("continues a streak completed yesterday", () => {
    const result = advanceStreak(row(), "2026-08-30");
    expect(result.current).toBe(4);
    expect(result.changed).toBe(true);
  });

  it("resets a streak after a missed day", () => {
    const result = advanceStreak(row({ last_completed_date: "2026-08-27" }), "2026-08-30");
    expect(result.current).toBe(1);
    // The best run survives the reset.
    expect(result.longest).toBe(9);
  });

  it("does not count the same day twice", () => {
    // Two tabs, or a double click on the last ritual.
    const result = advanceStreak(row({ last_completed_date: "2026-08-30" }), "2026-08-30");
    expect(result.current).toBe(3);
    expect(result.changed).toBe(false);
    expect(result.milestone).toBeNull();
  });

  it("raises the longest streak when the current one passes it", () => {
    const result = advanceStreak(row({ current_streak: 9, longest_streak: 9 }), "2026-08-30");
    expect(result.longest).toBe(10);
  });

  it("reports a milestone only on the exact day it lands", () => {
    const onIt = advanceStreak(row({ current_streak: 6 }), "2026-08-30");
    expect(onIt.milestone?.days).toBe(7);

    const pastIt = advanceStreak(row({ current_streak: 7 }), "2026-08-30");
    expect(pastIt.milestone).toBeNull();
  });
});

describe("streakTitle and nextMilestone", () => {
  it("names the run a member is on", () => {
    expect(streakTitle(0)).toBe("Not started");
    expect(streakTitle(3)).toBe("Building Momentum");
    expect(streakTitle(7)).toBe("Week Warrior");
    expect(streakTitle(120)).toBe("Quarter Champion");
  });

  it("points at the next rung, and at nothing past the last one", () => {
    expect(nextMilestone(3)?.days).toBe(7);
    expect(nextMilestone(7)?.days).toBe(30);
    expect(nextMilestone(400)).toBeNull();
  });
});

describe("weekCells", () => {
  // Sunday 30 August 2026 — the last cell in a Monday-first grid.
  const sunday = new Date(2026, 7, 30);

  it("puts today in the right cell of a Monday-first week", () => {
    const cells = weekCells(0, sunday, false);
    expect(cells).toHaveLength(7);
    expect(cells.findIndex((c) => c.isToday)).toBe(6);
  });

  it("fills backwards from today for the length of the run", () => {
    // A three-day run ending yesterday, with today not yet done.
    const cells = weekCells(3, sunday, false);
    expect(cells.filter((c) => c.filled).map((c) => c.label)).toEqual(["T", "F", "S"]);
    expect(cells[6].filled).toBe(false);
  });

  it("counts today once when today is already done", () => {
    const cells = weekCells(3, sunday, true);
    expect(cells.filter((c) => c.filled)).toHaveLength(3);
    expect(cells[6].filled).toBe(true);
  });

  it("never fills more than the week", () => {
    const cells = weekCells(400, sunday, true);
    expect(cells.every((c) => c.filled)).toBe(true);
  });
});
