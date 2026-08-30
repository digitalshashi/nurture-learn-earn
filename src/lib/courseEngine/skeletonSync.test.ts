import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

import { DEFAULT_BONUSES, FOUNDATION_DAYS, FOUNDATION_SLOTS } from "./slots";

/**
 * The skeleton exists twice on purpose, and must never differ.
 *
 * A Deno edge function cannot import from src/, so the frozen slot table is
 * copied into supabase/functions/_shared/courseSkeleton.ts. The copy is what
 * the prompts hand the model as fixed data; the original is what the app
 * validates the answer against. If they drift, generation starts failing
 * validation for a reason nobody can see from either file alone — the model is
 * being told to write a slot the validator has never heard of.
 */
const edge = readFileSync("supabase/functions/_shared/courseSkeleton.ts", "utf8");

const matchAll = (source: string, pattern: RegExp) =>
  [...source.matchAll(pattern)].map((match) => match.slice(1));

describe("the frozen skeleton is identical on both sides", () => {
  it("has the same 15 slot purposes in the same order", () => {
    const app = Object.keys(FOUNDATION_SLOTS)
      .map(Number)
      .sort((a, b) => a - b)
      .flatMap((day) => FOUNDATION_SLOTS[day].map((slot) => slot.purpose));

    expect(matchAll(edge, /purpose: "([^"]+)"/g).flat()).toEqual(app);
  });

  it("points the same slots at the same steps", () => {
    const app = Object.keys(FOUNDATION_SLOTS)
      .map(Number)
      .sort((a, b) => a - b)
      .flatMap((day) => FOUNDATION_SLOTS[day].map((slot) => String(slot.step_ref)));

    expect(matchAll(edge, /step_ref: (\d+|null) \}/g).flat()).toEqual(app);
  });

  it("names the three days the same way", () => {
    expect(matchAll(edge, /theme: "([^"]+)"/g).flat()).toEqual(FOUNDATION_DAYS.map((day) => day.theme));
    expect(matchAll(edge, /goal: "([^"]+)"/g).flat()).toEqual(FOUNDATION_DAYS.map((day) => day.goal));
  });

  it("lists the same six bonuses with the same resources", () => {
    expect(matchAll(edge, /topic: "([^"]+)"/g).flat()).toEqual(DEFAULT_BONUSES.map((bonus) => bonus.topic));

    expect(matchAll(edge, /resource: "([^"]+)", type: "([^"]+)"/g)).toEqual(
      DEFAULT_BONUSES.map((bonus) => [bonus.resource.name, bonus.resource.type]),
    );
  });
});
