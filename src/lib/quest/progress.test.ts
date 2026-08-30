import { describe, it, expect } from "vitest";
import {
  profileState,
  handbookState,
  gateState,
  toolChainState,
  momentumMeter,
  type ToolRun,
} from "./progress";
import { HANDBOOK_SECTIONS } from "./handbook";
import { POWER_TOOLS } from "./powerTools";
import { awardLadder, type AwardContext } from "./awards";

const fullProfile = {
  fullName: "Asha Rao",
  avatarUrl: "https://example.test/a.png",
  city: "Hyderabad",
  designation: "Clinic profitability coach",
  communityName: "Margin Club",
  socials: { instagram: "asha", linkedin: "asha-rao", youtube: "asharao" },
};

describe("profileState", () => {
  it("is complete only when every requirement is filled", () => {
    expect(profileState(fullProfile).complete).toBe(true);
    expect(profileState(fullProfile).missing).toEqual([]);
    expect(profileState(fullProfile).percent).toBe(100);
  });

  it("names what is missing so the gate card can show it", () => {
    const state = profileState({ ...fullProfile, designation: "", communityName: "   " });
    expect(state.complete).toBe(false);
    expect(state.missing).toEqual(["niche/title", "community name"]);
  });

  it("counts blank social handles as absent", () => {
    const state = profileState({
      ...fullProfile,
      socials: { instagram: "asha", linkedin: "", youtube: "   " },
    });
    expect(state.socialCount).toBe(1);
    expect(state.canPublish).toBe(false);
  });

  it("lets a member publish on socials alone, before the rest is done", () => {
    // Publishing is gated on the three links, not on the whole profile: those
    // are what a reader clicks, and the gate screen is a separate promise.
    const state = profileState({ socials: fullProfile.socials });
    expect(state.complete).toBe(false);
    expect(state.canPublish).toBe(true);
  });
});

describe("handbookState", () => {
  it("points at the first unread section", () => {
    const state = handbookState([HANDBOOK_SECTIONS[0].key]);
    expect(state.read).toBe(1);
    expect(state.nextKey).toBe(HANDBOOK_SECTIONS[1].key);
    expect(state.complete).toBe(false);
  });

  it("ignores rows for sections that no longer exist", () => {
    // A section can be cut from the handbook after somebody has read it. The
    // stale row must not push them past 100%.
    const state = handbookState([HANDBOOK_SECTIONS[0].key, "a-section-we-deleted"]);
    expect(state.read).toBe(1);
    expect(state.percent).toBeLessThan(100);
  });

  it("reaches 100% when every section is read", () => {
    const state = handbookState(HANDBOOK_SECTIONS.map((s) => s.key));
    expect(state.complete).toBe(true);
    expect(state.percent).toBe(100);
  });
});

describe("gateState", () => {
  const allRead = HANDBOOK_SECTIONS.map((s) => s.key);

  it("stays shut until both steps are finished", () => {
    const gate = gateState(profileState(fullProfile), handbookState([]));
    expect(gate.completed).toBe(1);
    expect(gate.unlocked).toBe(false);
  });

  it("opens when both are finished", () => {
    const gate = gateState(profileState(fullProfile), handbookState(allRead));
    expect(gate.unlocked).toBe(true);
    expect(gate.percent).toBe(100);
  });

  it("moves as a step fills in rather than only when it completes", () => {
    const half = profileState({ fullName: "Asha Rao", city: "Hyderabad", avatarUrl: "x" });
    const gate = gateState(half, handbookState([]));
    expect(gate.completed).toBe(0);
    expect(gate.percent).toBeGreaterThan(0);
  });
});

describe("toolChainState", () => {
  const done = (key: string, score: number | null = null): ToolRun => ({
    tool_key: key,
    status: "done",
    score,
    summary: null,
  });

  it("opens exactly one tool and locks the rest", () => {
    const state = toolChainState([]);
    expect(state.rows.filter((r) => r.status === "next")).toHaveLength(1);
    expect(state.rows[0].status).toBe("next");
    expect(state.rows.slice(1).every((r) => r.status === "locked")).toBe(true);
  });

  it("moves the open step forward as tools are finished", () => {
    const state = toolChainState([done(POWER_TOOLS[0].key)]);
    expect(state.rows[0].status).toBe("done");
    expect(state.rows[1].status).toBe("next");
    expect(state.next?.tool.key).toBe(POWER_TOOLS[1].key);
  });

  it("locks a later tool even when a run row exists out of order", () => {
    // A row can survive a re-order of the chain. Position decides the lock,
    // not the presence of a row, so nobody skips ahead.
    const state = toolChainState([done(POWER_TOOLS[3].key)]);
    expect(state.rows[0].status).toBe("next");
    expect(state.rows[3].status).toBe("done");
  });

  it("scales a scored tool's contribution by its score", () => {
    const scorecard = POWER_TOOLS.find((t) => t.scored)!;
    const half = toolChainState([done(scorecard.key, 50)]);
    const full = toolChainState([done(scorecard.key, 100)]);
    expect(half.potency).toBe(Math.round(scorecard.weight * 0.5));
    expect(full.potency).toBe(scorecard.weight);
  });

  it("reaches 100 potency only with every tool finished and scored", () => {
    const state = toolChainState(POWER_TOOLS.map((t) => done(t.key, 100)));
    expect(state.complete).toBe(state.total);
    expect(state.potency).toBe(100);
  });
});

describe("momentumMeter", () => {
  const idle = {
    gate: gateState(profileState({}), handbookState([])),
    currentStreak: 0,
    potency: 0,
    storiesPublished: 0,
    commentsLeft: 0,
  };

  it("is zero with nothing done", () => {
    expect(momentumMeter(idle).score).toBe(0);
  });

  it("caps a runaway streak so it cannot hide the other bands", () => {
    const long = momentumMeter({ ...idle, currentStreak: 400 });
    const thirty = momentumMeter({ ...idle, currentStreak: 30 });
    expect(long.score).toBe(thirty.score);
    expect(long.score).toBeLessThan(100);
  });

  it("names the band with the most headroom", () => {
    const state = momentumMeter({ ...idle, potency: 100 });
    expect(state.weakest.key).not.toBe("build");
  });
});

describe("awardLadder", () => {
  const ctx: AwardContext = {
    gateComplete: true,
    longestStreak: 7,
    storiesPublished: 1,
    toolsComplete: POWER_TOOLS.length,
    totalTools: POWER_TOOLS.length,
  };

  it("unlocks auto rungs from the member's own state", () => {
    const rows = awardLadder(ctx, {});
    expect(rows.find((r) => r.award.key === "ground-zero")?.status).toBe("achieved");
    expect(rows.find((r) => r.award.key === "ritual-keeper")?.status).toBe("achieved");
    expect(rows.find((r) => r.award.key === "toolsmith")?.status).toBe("achieved");
  });

  it("offers apply rungs rather than granting them", () => {
    const rows = awardLadder(ctx, {});
    expect(rows.find((r) => r.award.key === "hall-of-fame")?.status).toBe("apply");
  });

  it("keeps a rung locked while the one below it is not held", () => {
    // "Achieve 1 Crore Champion first" has to be a real constraint, not copy.
    const rows = awardLadder(ctx, {});
    const ten = rows.find((r) => r.award.key === "ten-crore-champion")!;
    expect(ten.status).toBe("locked");
    expect(ten.blockedBy).toBe("1 Crore Champion");
  });

  it("cascades an approval down the ladder", () => {
    const rows = awardLadder(ctx, { "hall-of-fame": "approved", "crore-champion": "approved" });
    expect(rows.find((r) => r.award.key === "ten-crore-champion")?.status).toBe("apply");
  });

  it("shows a submitted claim as pending, not as won", () => {
    const rows = awardLadder(ctx, { "hall-of-fame": "pending" });
    expect(rows.find((r) => r.award.key === "hall-of-fame")?.status).toBe("pending");
    // ...and the rung above stays shut while it is under review.
    expect(rows.find((r) => r.award.key === "crore-champion")?.status).toBe("locked");
  });

  it("locks everything above a rung a member has not earned", () => {
    const rows = awardLadder({ ...ctx, gateComplete: false }, {});
    expect(rows.every((r) => r.status === "locked")).toBe(true);
  });
});
