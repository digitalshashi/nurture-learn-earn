import { describe, it, expect, vi, afterEach } from "vitest";
import { playAttentionChime } from "./notifySound";

/**
 * The chime is a nicety layered on top of a validation message. Every test
 * here is really the same assertion: whatever audio does, the form still works.
 */
describe("playAttentionChime", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stays silent rather than throwing where there is no audio", () => {
    // jsdom has no AudioContext, which is also the real case in older Safari
    // and anywhere audio is disabled by policy.
    expect(() => playAttentionChime()).not.toThrow();
  });

  it("swallows a constructor that throws", () => {
    // Some browsers throw when a context is created outside a user gesture.
    vi.stubGlobal(
      "AudioContext",
      class {
        constructor() {
          throw new Error("not allowed without a gesture");
        }
      },
    );
    expect(() => playAttentionChime()).not.toThrow();
  });

  it("plays two notes and resumes a suspended context", () => {
    const started: number[] = [];
    const resume = vi.fn();

    const node = () => ({
      connect: vi.fn().mockReturnValue({ connect: vi.fn() }),
    });

    const oscillator = () => ({
      type: "",
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn().mockReturnValue({ connect: vi.fn() }),
      start: vi.fn((at: number) => started.push(at)),
      stop: vi.fn(),
    });

    vi.stubGlobal(
      "AudioContext",
      class {
        state = "suspended";
        currentTime = 0;
        destination = {};
        resume = resume;
        createOscillator = oscillator;
        createGain = () => ({
          gain: {
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          ...node(),
        });
      },
    );

    playAttentionChime();

    // Ting-ting: the second note is offset, not stacked on the first.
    expect(started).toHaveLength(2);
    expect(started[1]).toBeGreaterThan(started[0]);
    expect(resume).toHaveBeenCalled();
  });
});
