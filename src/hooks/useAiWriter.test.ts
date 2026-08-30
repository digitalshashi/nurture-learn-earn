import { describe, it, expect } from "vitest";
import { buildPrompt } from "./useAiWriter";

describe("buildPrompt", () => {
  it("states the task", () => {
    expect(buildPrompt({ task: "a WhatsApp broadcast", fields: [] })).toContain(
      "Write a WhatsApp broadcast.",
    );
  });

  it("passes on what the form already knows, so the coach need not retype it", () => {
    const prompt = buildPrompt({
      task: "a certificate",
      context: { Course: "Foundations of Coaching", "Design style": "classic" },
      fields: [],
    });
    expect(prompt).toContain("- Course: Foundations of Coaching");
    expect(prompt).toContain("- Design style: classic");
  });

  it("drops empty context so half-filled forms do not send blanks", () => {
    // A blank line reads to the model as a real but unknown value, which is
    // how you get copy about "the course" instead of about this course.
    const prompt = buildPrompt({
      task: "an email",
      context: { Course: "", Audience: null, Goal: undefined, Title: "  ", Tone: "warm" },
      fields: [],
    });
    expect(prompt).not.toContain("Course");
    expect(prompt).not.toContain("Audience");
    expect(prompt).not.toContain("Goal");
    expect(prompt).not.toContain("Title");
    expect(prompt).toContain("- Tone: warm");
  });

  it("omits the context heading entirely when nothing is filled in", () => {
    const prompt = buildPrompt({ task: "an email", context: { A: "" }, fields: [] });
    expect(prompt).not.toContain("What you know");
  });

  it("appends the coach's steer last, so it overrides the defaults", () => {
    const prompt = buildPrompt({
      task: "an email",
      context: { Tone: "warm" },
      fields: [],
      instructions: "keep it under 60 words",
    });
    expect(prompt.indexOf("Also: keep it under 60 words")).toBeGreaterThan(
      prompt.indexOf("- Tone: warm"),
    );
  });

  it("ignores a whitespace-only steer", () => {
    expect(buildPrompt({ task: "an email", fields: [], instructions: "   " })).not.toContain(
      "Also:",
    );
  });
});
