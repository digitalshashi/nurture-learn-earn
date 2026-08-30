import { describe, it, expect } from "vitest";
import { computeDripLocks, lockedChapterIds, type DripSection } from "./drip";

const NOW = new Date("2026-03-10T12:00:00Z");

function section(id: string, chapters: string[], extra: Partial<DripSection> = {}): DripSection {
  return { id, title: id, chapters: chapters.map((c) => ({ id: c })), ...extra };
}

const SECTIONS = [
  section("one", ["a", "b"], { drip_delay_days: 0, drip_date: "2026-03-01" }),
  section("two", ["c"], { drip_delay_days: 7, drip_date: "2026-03-20" }),
  section("three", ["d"], { drip_delay_days: 30, drip_date: "2026-04-01" }),
];

describe("computeDripLocks", () => {
  it("opens everything when no schedule is set", () => {
    const locks = computeDripLocks({
      dripType: "none",
      sections: SECTIONS,
      completedChapterIds: new Set(),
      now: NOW,
    });
    expect([...locks.values()].every((l) => !l.locked)).toBe(true);
  });

  // A coach editing the course has to be able to open every lesson to check it.
  it("opens everything for someone who bypasses the schedule", () => {
    const locks = computeDripLocks({
      dripType: "completion",
      sections: SECTIONS,
      completedChapterIds: new Set(),
      bypass: true,
      now: NOW,
    });
    expect(locks.get("three")?.locked).toBe(false);
  });

  it("counts enrolment delays from the enrolment date", () => {
    const locks = computeDripLocks({
      dripType: "enrollment",
      sections: SECTIONS,
      enrolledAt: "2026-03-05T12:00:00Z",
      completedChapterIds: new Set(),
      now: NOW,
    });
    expect(locks.get("one")?.locked).toBe(false); // no delay
    expect(locks.get("two")?.locked).toBe(true); // day 7, only 5 elapsed
    expect(locks.get("two")?.reason).toBe("Unlocks in 2 days");
    expect(locks.get("three")?.locked).toBe(true);
  });

  it("opens delayed sections once the delay has passed", () => {
    const locks = computeDripLocks({
      dripType: "enrollment",
      sections: SECTIONS,
      enrolledAt: "2026-01-01T12:00:00Z",
      completedChapterIds: new Set(),
      now: NOW,
    });
    expect([...locks.values()].every((l) => !l.locked)).toBe(true);
  });

  // Locking on a guessed clock would shut out anyone whose enrolment row we
  // could not read, which is worse than showing them the lesson.
  it("does not apply an enrolment schedule without an enrolment date", () => {
    const locks = computeDripLocks({
      dripType: "enrollment",
      sections: SECTIONS,
      enrolledAt: null,
      completedChapterIds: new Set(),
      now: NOW,
    });
    expect(locks.get("three")?.locked).toBe(false);
  });

  it("holds dated sections until their day starts", () => {
    const locks = computeDripLocks({
      dripType: "date",
      sections: SECTIONS,
      completedChapterIds: new Set(),
      now: NOW,
    });
    expect(locks.get("one")?.locked).toBe(false);
    expect(locks.get("two")?.locked).toBe(true);
    expect(locks.get("two")?.reason).toMatch(/^Unlocks /);
  });

  it("unlocks the next section only once the one before it is finished", () => {
    const partly = computeDripLocks({
      dripType: "completion",
      sections: SECTIONS,
      completedChapterIds: new Set(["a"]),
      now: NOW,
    });
    expect(partly.get("one")?.locked).toBe(false);
    expect(partly.get("two")?.locked).toBe(true);
    expect(partly.get("two")?.reason).toContain("one");

    const finished = computeDripLocks({
      dripType: "completion",
      sections: SECTIONS,
      completedChapterIds: new Set(["a", "b"]),
      now: NOW,
    });
    expect(finished.get("two")?.locked).toBe(false);
    expect(finished.get("three")?.locked).toBe(true);
  });

  it("names every chapter inside a locked section", () => {
    const locks = computeDripLocks({
      dripType: "completion",
      sections: SECTIONS,
      completedChapterIds: new Set(),
      now: NOW,
    });
    expect(lockedChapterIds(SECTIONS, locks)).toEqual(new Set(["c", "d"]));
  });
});
