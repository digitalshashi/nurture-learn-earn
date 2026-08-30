import { describe, it, expect } from "vitest";
import {
  confirmationMatches,
  courseDeleteWarnings,
  requiresTypedConfirmation,
} from "./courseDelete";

const impact = (students: number, sections = 0, chapters = 0) => ({
  students,
  sections,
  chapters,
});

describe("requiresTypedConfirmation", () => {
  it("asks a coach to type the title once real students would lose access", () => {
    expect(requiresTypedConfirmation(impact(1))).toBe(true);
  });

  it("does not stand in the way of deleting an empty draft", () => {
    // A guard everyone types past on autopilot protects nothing, and most
    // deletions are abandoned drafts.
    expect(requiresTypedConfirmation(impact(0, 3, 12))).toBe(false);
  });
});

describe("confirmationMatches", () => {
  it("accepts the title as typed", () => {
    expect(confirmationMatches("Growth Bootcamp", "Growth Bootcamp")).toBe(true);
  });

  it("forgives case and stray whitespace, which are not the point of the guard", () => {
    expect(confirmationMatches("  growth bootcamp ", "Growth Bootcamp")).toBe(true);
  });

  it("rejects a near miss", () => {
    expect(confirmationMatches("Growth Bootcam", "Growth Bootcamp")).toBe(false);
    expect(confirmationMatches("", "Growth Bootcamp")).toBe(false);
  });
});

describe("courseDeleteWarnings", () => {
  it("leads with the students, who are the part that is not the coach's to lose", () => {
    const [first] = courseDeleteWarnings(impact(24, 3, 12), true);
    expect(first).toMatch(/24 enrolled students/);
    expect(first).toMatch(/paid/);
  });

  it("says nothing about students when there are none", () => {
    const warnings = courseDeleteWarnings(impact(0, 2, 5), false);
    expect(warnings.join(" ")).not.toMatch(/enrolled/);
  });

  it("counts sections and lessons, singular and plural", () => {
    expect(courseDeleteWarnings(impact(0, 1, 1), false).join(" ")).toMatch(
      /1 section and 1 lesson\b/,
    );
    expect(courseDeleteWarnings(impact(0, 2, 9), false).join(" ")).toMatch(
      /2 sections and 9 lessons/,
    );
  });

  it("warns about broken links only for a course that is actually live", () => {
    expect(courseDeleteWarnings(impact(0, 1, 1), true).join(" ")).toMatch(/checkout links/);
    expect(courseDeleteWarnings(impact(0, 1, 1), false).join(" ")).not.toMatch(/checkout links/);
  });

  it("always says the media survives, which is the half people get wrong", () => {
    // Storage is deliberately untouched: a video can be attached to several
    // courses, so deleting one course must not take it away from the others.
    for (const published of [true, false]) {
      expect(courseDeleteWarnings(impact(0), published).join(" ")).toMatch(
        /stay in your video library/,
      );
    }
  });
});
