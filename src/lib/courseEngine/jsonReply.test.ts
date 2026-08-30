import { describe, it, expect, vi, afterEach } from "vitest";

import {
  extractJson,
  parseModelJson,
  repairTruncatedJson,
  strictParseJson,
} from "../../../supabase/functions/_shared/jsonReply";

/** Six steps, cut off partway through the sixth — the failure this all exists for. */
const TRUNCATED = `{
  "steps": [
    { "number": 1, "name": "Foundation & Clarity", "achievement": "A clear starting point." },
    { "number": 2, "name": "Core Skill Basics", "achievement": "The skill practised." },
    { "number": 3, "name": "Build Your System", "achievement": "A repeatable process." },
    { "number": 4, "name": "Reach & Visibility", "achievement": "Work put in front of people." },
    { "number": 5, "name": "Convert & Deliver", "achievement": "The first real result." },
    { "number": 6, "name": "Scale & Sus`;

/** What a finished six-steps reply looks like, as the handler declares it. */
const HAS_STEPS = (value: unknown) => Array.isArray((value as { steps?: unknown })?.steps);

afterEach(() => vi.restoreAllMocks());

describe("extracting JSON from a model reply", () => {
  it("ignores prose wrapped around the object", () => {
    const reply = 'Sure! Here you go:\n```json\n{"steps": []}\n```\nHope that helps.';
    expect(strictParseJson(reply)).toEqual({ steps: [] });
  });

  it("stops at the matching brace, not the last one in the text", () => {
    // The old first-brace-to-last-brace slice spanned the trailing example
    // too, and parsed as nothing.
    const reply = '{"steps": [1]} — note the shape is {"steps": [...]}';
    expect(extractJson(reply)).toBe('{"steps": [1]}');
    expect(strictParseJson(reply)).toEqual({ steps: [1] });
  });

  it("is not fooled by braces inside strings", () => {
    const reply = '{"covers": "Use the {name} placeholder", "slot": 1}';
    expect(strictParseJson(reply)).toEqual({ covers: "Use the {name} placeholder", slot: 1 });
  });

  it("is not fooled by escaped quotes", () => {
    const reply = '{"title": "The \\"real\\" way", "slot": 2}';
    expect(strictParseJson(reply)).toEqual({ title: 'The "real" way', slot: 2 });
  });

  it("finds the real answer when a continued reply restarted instead of resuming", () => {
    // Asked to continue, some providers start again from the top — and
    // OpenAI-style JSON mode all but forces it, since it only emits whole
    // objects. The accumulated text is then a fragment followed by the real
    // answer, and taking the first balanced span finds neither.
    const restarted = `${TRUNCATED}{"steps": [{"number": 1, "name": "Foundation & Clarity", "achievement": "Done."}]}`;

    const parsed = strictParseJson<{ steps: { name: string }[] }>(restarted, HAS_STEPS);
    expect(parsed?.steps).toHaveLength(1);
    expect(parsed?.steps[0].name).toBe("Foundation & Clarity");
  });

  it("prefers the whole object over an element inside it", () => {
    // Every array element is itself balanced, so "first candidate" would
    // return {"number": 1} and call the reply complete.
    const reply = '{"steps": [{"number": 1, "name": "A B"}, {"number": 2, "name": "C D"}]}';
    const parsed = strictParseJson<{ steps: unknown[] }>(reply, HAS_STEPS);
    expect(parsed?.steps).toHaveLength(2);
  });

  it("returns null for a truncated reply rather than pretending it is whole", () => {
    // This is what decides whether to ask for the rest, so a forgiving answer
    // here would silently ship a half-generated course.
    expect(extractJson(TRUNCATED)).toBeNull();
    expect(strictParseJson(TRUNCATED, HAS_STEPS)).toBeNull();
  });
});

describe("repairing a truncated reply", () => {
  it("keeps every complete element and drops the partial one", () => {
    const repaired = repairTruncatedJson(TRUNCATED);
    expect(repaired).not.toBeNull();

    const parsed = JSON.parse(repaired!) as { steps: { number: number; name: string }[] };
    expect(parsed.steps).toHaveLength(5);
    expect(parsed.steps.map((step) => step.number)).toEqual([1, 2, 3, 4, 5]);
    expect(parsed.steps[4].name).toBe("Convert & Deliver");
  });

  it("closes nested containers in the right order", () => {
    const cut = '{"foundation": {"days": [{"day": 1, "videos": [{"slot": 1}, {"slot": 2';
    const parsed = JSON.parse(repairTruncatedJson(cut)!) as {
      foundation: { days: { day: number; videos: { slot: number }[] }[] };
    };
    expect(parsed.foundation.days[0].videos).toEqual([{ slot: 1 }]);
  });

  it("leaves a complete reply exactly as it was", () => {
    const whole = '{"steps": [{"number": 1}]}';
    expect(JSON.parse(repairTruncatedJson(whole)!)).toEqual({ steps: [{ number: 1 }] });
  });

  it("gives up on a reply with no JSON in it at all", () => {
    expect(repairTruncatedJson("I cannot help with that request.")).toBeNull();
  });
});

describe("parseModelJson", () => {
  it("recovers what it can from a truncated reply", () => {
    const parsed = parseModelJson<{ steps: unknown[] }>(TRUNCATED, "The six steps", HAS_STEPS);
    expect(parsed.steps).toHaveLength(5);
  });

  it("throws a message a coach can read, and logs the reply for diagnosis", () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => parseModelJson("absolutely not JSON", "The six steps")).toThrow(
      /The six steps did not return usable JSON/,
    );
    // Without the raw reply in the log, a parse failure is undiagnosable.
    expect(logged).toHaveBeenCalled();
  });
});
