import { describe, it, expect } from "vitest";
import {
  belongsToThread,
  continuesRun,
  dayLabel,
  initials,
  mergeMessage,
  shortAge,
  startsNewDay,
  type ChatMessage,
} from "./messaging";

const ME = "me-uuid";
const THEM = "them-uuid";

const msg = (over: Partial<ChatMessage> = {}): ChatMessage => ({
  id: crypto.randomUUID(),
  sender_id: ME,
  receiver_id: THEM,
  message: "hello",
  is_read: false,
  read_at: null,
  created_at: "2026-08-30T10:00:00.000Z",
  ...over,
});

describe("continuesRun", () => {
  it("starts a run when there is nothing before it", () => {
    expect(continuesRun(msg(), undefined)).toBe(false);
  });

  it("groups consecutive messages from the same person", () => {
    const first = msg({ created_at: "2026-08-30T10:00:00.000Z" });
    const second = msg({ created_at: "2026-08-30T10:02:00.000Z" });
    expect(continuesRun(second, first)).toBe(true);
  });

  it("breaks the run when the speaker changes", () => {
    const theirs = msg({ sender_id: THEM, receiver_id: ME });
    const mine = msg({ created_at: "2026-08-30T10:00:30.000Z" });
    expect(continuesRun(mine, theirs)).toBe(false);
  });

  it("breaks the run after a long gap", () => {
    // A reply an hour later is a new thought, not a continuation.
    const first = msg({ created_at: "2026-08-30T10:00:00.000Z" });
    const later = msg({ created_at: "2026-08-30T11:00:00.000Z" });
    expect(continuesRun(later, first)).toBe(false);
  });
});

describe("startsNewDay", () => {
  /**
   * Built from local wall-clock time on purpose. A separator marks the
   * reader's day, not UTC's, so two UTC timestamps hours apart can genuinely
   * straddle midnight for someone in +05:30 — writing these as Z literals
   * makes the test pass or fail depending on where it runs.
   */
  const at = (day: number, hour: number) =>
    new Date(2026, 7, day, hour, 0, 0).toISOString();

  it("is true for the first message", () => {
    expect(startsNewDay(msg(), undefined)).toBe(true);
  });

  it("is false within the same day", () => {
    const a = msg({ created_at: at(30, 1) });
    const b = msg({ created_at: at(30, 22) });
    expect(startsNewDay(b, a)).toBe(false);
  });

  it("is true across a day boundary", () => {
    const a = msg({ created_at: at(29, 23) });
    const b = msg({ created_at: at(31, 1) });
    expect(startsNewDay(b, a)).toBe(true);
  });
});

describe("dayLabel", () => {
  const now = new Date("2026-08-30T12:00:00.000Z");

  it("names today and yesterday", () => {
    expect(dayLabel("2026-08-30T08:00:00.000Z", now)).toBe("Today");
    expect(dayLabel("2026-08-29T08:00:00.000Z", now)).toBe("Yesterday");
  });

  it("falls back to a date further back", () => {
    const label = dayLabel("2026-08-01T08:00:00.000Z", now);
    expect(label).not.toBe("Today");
    expect(label).not.toBe("Yesterday");
    expect(label.length).toBeGreaterThan(0);
  });
});

describe("shortAge", () => {
  const now = new Date("2026-08-30T12:00:00.000Z");

  it("reads as a glanceable age", () => {
    expect(shortAge("2026-08-30T11:59:40.000Z", now)).toBe("now");
    expect(shortAge("2026-08-30T11:30:00.000Z", now)).toBe("30m");
    expect(shortAge("2026-08-30T09:00:00.000Z", now)).toBe("3h");
    expect(shortAge("2026-08-28T12:00:00.000Z", now)).toBe("2d");
  });

  it("never shows a negative age for a clock that is slightly ahead", () => {
    expect(shortAge("2026-08-30T12:00:30.000Z", now)).toBe("now");
  });
});

describe("mergeMessage", () => {
  it("replaces the optimistic copy instead of duplicating it", () => {
    // The realtime echo of your own message arrives after the insert
    // response; without this you watch it appear twice.
    const pending: ChatMessage = msg({ id: "pending-1", message: "hi", pending: true });
    const confirmed: ChatMessage = msg({ id: "real-1", message: "hi" });

    const merged = mergeMessage([pending], confirmed);

    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("real-1");
    expect(merged[0].pending).toBeUndefined();
  });

  it("updates a message already in the list rather than appending", () => {
    const original = msg({ id: "real-1", is_read: false });
    const readNow = { ...original, is_read: true, read_at: "2026-08-30T10:05:00.000Z" };

    const merged = mergeMessage([original], readNow);

    expect(merged).toHaveLength(1);
    expect(merged[0].is_read).toBe(true);
    expect(merged[0].read_at).toBe("2026-08-30T10:05:00.000Z");
  });

  it("appends a genuinely new message", () => {
    const existing = msg({ id: "a" });
    const incoming = msg({ id: "b", message: "different" });
    expect(mergeMessage([existing], incoming)).toHaveLength(2);
  });

  it("does not treat someone else's identical text as my pending message", () => {
    const mine = msg({ id: "pending-1", message: "ok", pending: true });
    const theirs = msg({ id: "real-2", message: "ok", sender_id: THEM, receiver_id: ME });

    const merged = mergeMessage([mine], theirs);

    expect(merged).toHaveLength(2);
  });
});

describe("belongsToThread", () => {
  it("accepts both directions of the pair", () => {
    expect(belongsToThread({ sender_id: ME, receiver_id: THEM }, ME, THEM)).toBe(true);
    expect(belongsToThread({ sender_id: THEM, receiver_id: ME }, ME, THEM)).toBe(true);
  });

  it("rejects a message involving somebody else", () => {
    expect(belongsToThread({ sender_id: ME, receiver_id: "other" }, ME, THEM)).toBe(false);
    expect(belongsToThread({ sender_id: "x", receiver_id: "y" }, ME, THEM)).toBe(false);
  });
});

describe("initials", () => {
  it("uses first and last name", () => {
    expect(initials("Saikanth Vanga")).toBe("SV");
  });

  it("handles a single name and empty input", () => {
    expect(initials("kumar")).toBe("KU");
    expect(initials("")).toBe("?");
    expect(initials(null)).toBe("?");
  });
});
