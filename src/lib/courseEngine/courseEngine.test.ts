import { describe, it, expect } from "vitest";

import {
  applyGeneratedFoundation,
  applyGeneratedLive,
  buildFormulaPayload,
  buildManualPayload,
  buildPayload,
  countChapters,
  deriveStepsFromTopic,
  findBlanks,
  foundationSlotKeys,
  FOUNDATION_SLOTS,
  GENERIC_STEPS,
  isPublishable,
  isStructurallyValid,
  matchPreset,
  renderMarkdown,
  scanForFabrication,
  STEP_PRESETS,
  toCourseOutline,
  uncoveredSteps,
  validateStructure,
  wordCount,
  type CourseInput,
  type GeneratedFoundation,
} from "./index";

const INPUT: CourseInput = {
  topic: "Instagram content creation",
  audience: "Beginners who want to start on Instagram",
  starting_pain: "Zero followers and no idea what to post",
  desired_result: "Their first income from content online",
  coach_name: "Shashi Vanga",
};

/** A topic no preset knows, so the generic spine is what gets used. */
const ODD_INPUT: CourseInput = {
  topic: "Beekeeping for apartment balconies",
  audience: "City dwellers with a balcony",
  starting_pain: "No idea where to even keep a hive",
  desired_result: "Their first jar of honey",
  coach_name: "Anita Rao",
};

describe("the six transformation steps", () => {
  it("names every preset step in 2 to 4 plain words", () => {
    // The word count is a hard validation rule, so a preset that breaks it
    // would ship a course the engine then refuses to accept.
    for (const preset of [...STEP_PRESETS.map((p) => p.steps), GENERIC_STEPS].flat()) {
      const words = wordCount(preset.name);
      expect(words, `"${preset.name}"`).toBeGreaterThanOrEqual(2);
      expect(words, `"${preset.name}"`).toBeLessThanOrEqual(4);
    }
  });

  it("does not count an ampersand as a word", () => {
    expect(wordCount("Niche & Profile Setup")).toBe(3);
    expect(wordCount("Long-Term Maintenance")).toBe(2);
  });

  it("matches a topic to the preset built for it", () => {
    expect(matchPreset(INPUT)?.id).toBe("instagram");
    expect(matchPreset({ topic: "Losing belly fat", audience: "Busy dads" })?.id).toBe("fitness");
    expect(matchPreset(ODD_INPUT)).toBeNull();
  });

  it("still returns six numbered steps when nothing matches", () => {
    const steps = deriveStepsFromTopic(ODD_INPUT);
    expect(steps.map((step) => step.number)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("formula mode", () => {
  it("produces a structurally valid, publishable blueprint with no model call", () => {
    const payload = buildFormulaPayload(INPUT);
    expect(validateStructure(payload)).toEqual([]);
    expect(isPublishable(payload)).toBe(true);
  });

  it("works for every preset and for an unmatched topic", () => {
    const topics = [...STEP_PRESETS.map((preset) => preset.keywords[0]), ODD_INPUT.topic];
    for (const topic of topics) {
      const payload = buildFormulaPayload({ ...INPUT, topic });
      expect(validateStructure(payload), topic).toEqual([]);
    }
  });

  it("fills exactly 15 foundation videos against the frozen slot table", () => {
    const payload = buildFormulaPayload(INPUT);
    const videos = payload.foundation.days.flatMap((day) => day.videos);
    expect(videos).toHaveLength(15);

    for (const day of payload.foundation.days) {
      expect(day.videos.map((video) => video.slot_purpose)).toEqual(
        FOUNDATION_SLOTS[day.day].map((slot) => slot.purpose),
      );
    }
  });

  it("maps Day 2 to steps 1-3 and Day 3 to steps 4-6", () => {
    const payload = buildFormulaPayload(INPUT);
    const stepRefs = (day: number) =>
      payload.foundation.days.find((entry) => entry.day === day)!.videos.map((video) => video.step_ref);

    expect(stepRefs(1)).toEqual([null, null, null, null, null]);
    expect(stepRefs(2)).toEqual([null, 1, 2, 3, null]);
    expect(stepRefs(3)).toEqual([4, 5, 6, null, null]);
  });

  it("writes text that is actually about the coach's topic", () => {
    const payload = buildFormulaPayload(INPUT);
    const welcome = payload.foundation.days[0].videos[0];
    expect(welcome.title).toContain("Instagram content creation");
    expect(welcome.covers).toContain("beginners who want to start on Instagram");
  });

  it("gives every step at least one live session", () => {
    expect(uncoveredSteps(buildFormulaPayload(INPUT))).toEqual([]);
  });

  it("never invents a price", () => {
    const payload = buildFormulaPayload(INPUT);
    expect(payload.value_stack).toHaveLength(5);
    for (const item of payload.value_stack) expect(item.stated_value).toBeNull();
  });

  it("leaves the mission number for the coach rather than making one up", () => {
    const payload = buildFormulaPayload(INPUT);
    expect(payload.positioning.mission_statement).toContain("[how many]");
  });
});

describe("manual mode", () => {
  it("hands the coach the structure but none of the writing", () => {
    const payload = buildManualPayload(INPUT);
    expect(validateStructure(payload)).toEqual([]);
    expect(isPublishable(payload)).toBe(false);

    const videos = payload.foundation.days.flatMap((day) => day.videos);
    expect(videos).toHaveLength(15);
    expect(videos.every((video) => video.title === "")).toBe(true);
    // The locked labels stay: they are what the coach is writing against.
    expect(videos.every((video) => video.slot_purpose !== "")).toBe(true);
  });

  it("names every empty slot so the editor can point at them", () => {
    const blanks = findBlanks(buildManualPayload(INPUT));
    expect(blanks.length).toBeGreaterThan(0);
    expect(blanks.every((violation) => violation.severity === "warning")).toBe(true);
  });

  it("has a suggestion ready for every slot in the skeleton", () => {
    // A slot added to the skeleton without a matching suggestion would render
    // as a permanently empty field with no way to fill it but typing.
    const skeletonKeys = Object.entries(FOUNDATION_SLOTS)
      .flatMap(([day, slots]) => slots.map((slot) => `${day}-${slot.slot}`))
      .sort();
    expect(foundationSlotKeys().sort()).toEqual(skeletonKeys);
  });

  it("keeps a plan the coach already wrote instead of blanking it", () => {
    const payload = buildManualPayload({
      ...INPUT,
      live_plan: ["Day 1: pick your niche", "Day 2: set up the profile", "Day 3: first three reels"],
    });
    expect(payload.live.source).toBe("coach");
    expect(payload.live.sessions.map((session) => session.title)).toEqual([
      "Day 1: pick your niche",
      "Day 2: set up the profile",
      "Day 3: first three reels",
    ]);
  });
});

describe("a coach's existing plan", () => {
  it("is tagged to steps in order, never backwards", () => {
    const plan = Array.from({ length: 11 }, (_, i) => `Day ${i + 1} session`);
    const payload = buildFormulaPayload({ ...INPUT, live_plan: plan });

    expect(payload.live.source).toBe("coach");
    expect(payload.live.sessions).toHaveLength(11);

    const refs = payload.live.sessions.map((session) => session.step_ref);
    expect(refs).toEqual([...refs].sort((a, b) => a - b));
    expect(new Set(refs).size).toBe(6);
  });
});

describe("AI output merging", () => {
  const skeleton = () => buildFormulaPayload(INPUT);

  it("refuses to let the model rename a slot or re-point a step", () => {
    // The model is never asked for these fields, but it returns them anyway,
    // and a course whose Day 2 teaches step 4 is the failure this prevents.
    const merged = applyGeneratedFoundation(skeleton(), {
      days: [
        {
          day: 2,
          videos: [
            {
              slot: 2,
              title: "Model title",
              covers: "Model covers",
              learner_actions: ["Do the thing"],
              // Deliberately wrong, and deliberately ignored: the model is never
              // asked for these two fields, and must not be able to set them.
              slot_purpose: "Something else entirely",
              step_ref: 4,
            },
          ],
        },
      ],
    } as unknown as GeneratedFoundation);

    const video = merged.foundation.days[1].videos[1];
    expect(video.title).toBe("Model title");
    expect(video.slot_purpose).toBe(FOUNDATION_SLOTS[2][1].purpose);
    expect(video.step_ref).toBe(1);
    expect(validateStructure(merged)).toEqual([]);
  });

  it("falls back to the formula for anything the model left blank", () => {
    const base = skeleton();
    const merged = applyGeneratedFoundation(base, {
      days: [{ day: 1, videos: [{ slot: 1, title: "  ", covers: "", learner_actions: [] }] }],
    });

    const video = merged.foundation.days[0].videos[0];
    expect(video.title).toBe(base.foundation.days[0].videos[0].title);
    expect(video.learner_actions.length).toBeGreaterThan(0);
  });

  it("survives a truncated generation with a complete course", () => {
    // Only Day 1 came back before the model ran out of room.
    const merged = applyGeneratedFoundation(skeleton(), {
      days: [
        {
          day: 1,
          videos: Array.from({ length: 5 }, (_, i) => ({
            slot: i + 1,
            title: `Written ${i + 1}`,
            covers: "Written covers",
            learner_actions: ["Act"],
          })),
        },
      ],
    });

    expect(isPublishable(merged)).toBe(true);
    expect(merged.foundation.days[0].videos[0].title).toBe("Written 1");
    expect(merged.foundation.days[2].videos[0].title).toContain("Step 4");
  });

  it("leaves a section the run did not cover exactly as the coach left it", () => {
    // Regenerating only Day 1 must not reset Day 3 to formula text — that is
    // how a coach loses an afternoon of editing to a button they thought was
    // scoped.
    const base = skeleton();
    base.foundation.days[2].videos[0].title = "Coach wrote this";

    const merged = applyGeneratedFoundation(base, {
      days: [{ day: 1, videos: [{ slot: 1, title: "New day one", covers: "New", learner_actions: ["Go"] }] }],
    });

    expect(merged.foundation.days[0].videos[0].title).toBe("New day one");
    expect(merged.foundation.days[2].videos[0].title).toBe("Coach wrote this");
  });

  it("leaves the live plan alone when the run did not include it", () => {
    const base = skeleton();
    base.live.sessions[0].title = "Coach retitled this";

    const merged = applyGeneratedLive(base, undefined);
    expect(merged.live.sessions[0].title).toBe("Coach retitled this");
  });

  it("throws away a live plan that leaves a step uncovered", () => {
    const merged = applyGeneratedLive(skeleton(), {
      sessions: [
        { day: 1, step_ref: 1, title: "Only session", taught: "Something", outcome: "Something" },
      ],
    });

    expect(uncoveredSteps(merged)).toEqual([]);
    expect(merged.live.sessions.length).toBeGreaterThan(1);
  });

  it("never overwrites a plan the coach supplied", () => {
    const base = buildFormulaPayload({ ...INPUT, live_plan: ["My day one", "My day two"] });
    const merged = applyGeneratedLive(base, {
      sessions: Array.from({ length: 6 }, (_, i) => ({
        day: i + 1,
        step_ref: i + 1,
        title: `Generated ${i + 1}`,
        taught: "x",
        outcome: "y",
      })),
    });

    expect(merged.live.sessions.map((session) => session.title)).toEqual(["My day one", "My day two"]);
  });
});

describe("validation", () => {
  it("catches a missing bonus", () => {
    const payload = buildFormulaPayload(INPUT);
    payload.bonuses.pop();
    expect(isStructurallyValid(payload)).toBe(false);
    expect(validateStructure(payload).map((violation) => violation.rule)).toContain("bonuses.count");
  });

  it("catches a step name that is one word", () => {
    const payload = buildFormulaPayload(INPUT);
    payload.steps[0].name = "Monetization";
    expect(validateStructure(payload).map((violation) => violation.rule)).toContain("steps.name_length");
  });

  it("catches a sixteenth video", () => {
    const payload = buildFormulaPayload(INPUT);
    payload.foundation.days[0].videos.push({ ...payload.foundation.days[0].videos[0], slot: 6 });
    expect(validateStructure(payload).map((violation) => violation.rule)).toContain("foundation.video_count");
  });

  it("flags invented numbers and testimonials for review without blocking", () => {
    const payload = buildFormulaPayload(INPUT);
    payload.foundation.days[0].videos[0].covers = "Our students earned 300% more in 30 days.";
    const flagged = scanForFabrication(payload).map((violation) => violation.rule);

    expect(flagged).toContain("claims.percentage");
    expect(flagged).toContain("claims.testimonial");
    expect(isStructurallyValid(payload)).toBe(true);
  });

  it("passes a clean formula blueprint through the fabrication scan", () => {
    expect(scanForFabrication(buildFormulaPayload(INPUT))).toEqual([]);
  });
});

describe("rendering and publishing", () => {
  it("renders every step and every video into the markdown export", () => {
    const payload = buildFormulaPayload(INPUT);
    const markdown = renderMarkdown(payload);

    for (const step of payload.steps) expect(markdown).toContain(step.name);
    for (const video of payload.foundation.days.flatMap((day) => day.videos)) {
      expect(markdown).toContain(video.title);
    }
    for (const bonus of payload.bonuses) expect(markdown).toContain(bonus.resource.name);
  });

  it("warns in the export when a step has no live session", () => {
    const payload = buildFormulaPayload(INPUT);
    payload.live.sessions = payload.live.sessions.filter((session) => session.step_ref !== 3);
    expect(renderMarkdown(payload)).toContain("No live session is attached to");
  });

  it("lays the blueprint out as three day sections, six bonuses and the live classes", () => {
    const outline = toCourseOutline(buildFormulaPayload(INPUT));

    expect(outline.sections).toHaveLength(11);
    expect(outline.sections.slice(0, 3).map((section) => section.title)).toEqual([
      "Day 1 — Foundation & Belief Building",
      "Day 2 — Skills & Steps 1-3",
      "Day 3 — Steps 4-6 & The Next Level",
    ]);
    expect(outline.sections[9].title).toBe("Inner Circle Vault");
    expect(outline.sections[10].title).toBe("Live Classes");

    // 15 foundation + 6 bonuses x (3 videos + 1 resource) + vault call and
    // contents + 12 live
    expect(countChapters(outline)).toBe(15 + 24 + 2 + 12);
  });

  it("gives every published chapter a title, even from a blank blueprint", () => {
    const outline = toCourseOutline(buildManualPayload(INPUT));
    for (const section of outline.sections) {
      for (const chapter of section.chapters) expect(chapter.title.trim()).not.toBe("");
    }
  });
});

describe("the Inner Circle Vault", () => {
  it("is created with every course, with a weekly call", () => {
    const payload = buildFormulaPayload(INPUT);

    expect(payload.inner_circle.enabled).toBe(true);
    expect(payload.inner_circle.name).toBe("Inner Circle Vault");
    expect(payload.inner_circle.call.cadence).toBe("weekly");
    expect(payload.inner_circle.call.title).toMatch(/weekly/i);
    expect(payload.inner_circle.includes.length).toBeGreaterThan(0);
  });

  it("describes itself in the coach's own terms", () => {
    const payload = buildFormulaPayload(INPUT);
    expect(payload.inner_circle.description).toContain("Shashi Vanga");
  });

  it("drops out of the published course when switched off", () => {
    const payload = buildFormulaPayload(INPUT);
    payload.inner_circle.enabled = false;

    const titles = toCourseOutline(payload).sections.map((section) => section.title);
    expect(titles).not.toContain("Inner Circle Vault");
  });

  it("appears in the export", () => {
    expect(renderMarkdown(buildFormulaPayload(INPUT))).toContain("Inner Circle Vault");
  });
});

describe("live classes are optional", () => {
  const recordedOnly = () => {
    const payload = buildPayload(INPUT, deriveStepsFromTopic(INPUT), {
      mode: "formula",
      fill: "suggested",
      includeLive: false,
    });
    return payload;
  };

  it("is a finished, publishable course with no sessions at all", () => {
    const payload = recordedOnly();
    payload.live.sessions = [];

    // Without the opt-out this reported six uncovered steps and refused to
    // publish — twelve classes the coach never agreed to run.
    expect(payload.live.included).toBe(false);
    expect(findBlanks(payload).filter((v) => v.rule.startsWith("live"))).toEqual([]);
    expect(isPublishable(payload)).toBe(true);
  });

  it("publishes no Live Classes section", () => {
    const payload = recordedOnly();
    const titles = toCourseOutline(payload).sections.map((section) => section.title);

    expect(titles).not.toContain("Live Classes");
    expect(titles).toContain("Inner Circle Vault");
  });

  it("says so in the export instead of printing an empty part", () => {
    const markdown = renderMarkdown(recordedOnly());
    expect(markdown).toContain("Not included");
    expect(markdown).toContain("recorded programme");
  });

  it("still defaults to included", () => {
    expect(buildFormulaPayload(INPUT).live.included).toBe(true);
  });
});

describe("mode is recorded on the blueprint", () => {
  it("says how each one was built", () => {
    expect(buildFormulaPayload(INPUT).meta.mode).toBe("formula");
    expect(buildManualPayload(INPUT).meta.mode).toBe("manual");
    expect(buildPayload(INPUT, deriveStepsFromTopic(INPUT), { mode: "ai" }).meta.mode).toBe("ai");
  });
});
