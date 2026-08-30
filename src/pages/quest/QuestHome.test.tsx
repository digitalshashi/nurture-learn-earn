import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import QuestHome from "./QuestHome";
import {
  gateState,
  handbookState,
  momentumMeter,
  profileState,
  toolChainState,
} from "@/lib/quest/progress";
import { awardLadder, currentAwardLevel } from "@/lib/quest/awards";
import { HANDBOOK_SECTIONS } from "@/lib/quest/handbook";
import { POWER_TOOLS } from "@/lib/quest/powerTools";

/**
 * Home is two screens behind one boolean, and which one a member gets is the
 * single most consequential branch in the section. These render both for real
 * — the progress maths is the genuine article, only the data layer is stubbed.
 */

const questValue = vi.fn();
vi.mock("@/contexts/QuestContext", () => ({
  useQuest: () => questValue(),
}));

/** A context value built from the real derivations, so the numbers are honest. */
function buildQuest(over: { profileFilled?: boolean; handbookRead?: boolean } = {}) {
  const profile = profileState(
    over.profileFilled
      ? {
          fullName: "Asha Rao",
          avatarUrl: "x",
          city: "Hyderabad",
          designation: "Coach",
          communityName: "Margin Club",
          socials: { instagram: "a", linkedin: "b", youtube: "c" },
        }
      : { fullName: "Asha Rao" },
  );
  const handbook = handbookState(over.handbookRead ? HANDBOOK_SECTIONS.map((s) => s.key) : []);
  const gate = gateState(profile, handbook);
  const tools = toolChainState([]);
  const momentum = momentumMeter({
    gate,
    currentStreak: 0,
    potency: tools.potency,
    storiesPublished: 0,
    commentsLeft: 0,
  });
  const awards = awardLadder(
    {
      gateComplete: gate.unlocked,
      longestStreak: 0,
      storiesPublished: 0,
      toolsComplete: 0,
      totalTools: tools.total,
    },
    {},
  );

  return {
    loading: false,
    degraded: false,
    refresh: vi.fn(),
    displayName: "Asha Rao",
    firstName: "Asha",
    avatarUrl: null,
    questProfile: null,
    handbookRead: new Set<string>(over.handbookRead ? HANDBOOK_SECTIONS.map((s) => s.key) : []),
    rituals: [],
    completedToday: new Set<string>(),
    streak: { current: 0, longest: 0 },
    toolRuns: [],
    totalXp: 0,
    storiesPublished: 0,
    storiesDraft: 0,
    commentsLeft: 0,
    applications: {},
    profile,
    handbook,
    gate,
    tools,
    momentum,
    awards,
    awardLevel: currentAwardLevel(awards),
  };
}

const renderHome = () =>
  render(
    <MemoryRouter>
      <QuestHome />
    </MemoryRouter>,
  );

beforeEach(() => questValue.mockReset());

describe("before the gate is cleared", () => {
  it("shows the two steps and nothing from the command centre", () => {
    questValue.mockReturnValue(buildQuest());
    renderHome();

    expect(screen.getByText(/Two quick steps stand between you/i)).toBeInTheDocument();
    expect(screen.getByText("Make yourself known")).toBeInTheDocument();
    expect(screen.getByText("Learn the system")).toBeInTheDocument();
    // The tools the gate is protecting must not be previewed underneath it.
    // The footer copy names them as a promise, so this asserts against the
    // widgets themselves rather than against the words.
    expect(screen.queryByText("Command centre")).not.toBeInTheDocument();
    expect(
      screen.queryByText("How much of this system is switched on for you."),
    ).not.toBeInTheDocument();
  });

  it("names what the profile is still missing", () => {
    questValue.mockReturnValue(buildQuest());
    renderHome();
    expect(screen.getByText(/Missing:/)).toHaveTextContent("niche/title");
  });

  it("keeps the gate shut when only one step is done", () => {
    questValue.mockReturnValue(buildQuest({ profileFilled: true }));
    renderHome();

    expect(screen.getByText("1 of 2 complete")).toBeInTheDocument();
    expect(screen.queryByText("Command centre")).not.toBeInTheDocument();
  });
});

describe("once both steps are done", () => {
  it("swaps the gate for the command centre", () => {
    questValue.mockReturnValue(buildQuest({ profileFilled: true, handbookRead: true }));
    renderHome();

    expect(screen.queryByText(/Two quick steps/i)).not.toBeInTheDocument();
    expect(screen.getByText("Command centre")).toBeInTheDocument();
    expect(screen.getByText(/Momentum Meter/)).toBeInTheDocument();
  });

  it("offers exactly one next action, and it points somewhere real", () => {
    questValue.mockReturnValue(buildQuest({ profileFilled: true, handbookRead: true }));
    renderHome();

    expect(screen.getAllByText("DO THIS NEXT")).toHaveLength(1);
    // With no rituals loaded, the chain is the next thing that moves.
    expect(screen.getByText(`Continue: ${POWER_TOOLS[0].name}`)).toBeInTheDocument();
  });

  it("puts every gated destination on the grid", () => {
    questValue.mockReturnValue(buildQuest({ profileFilled: true, handbookRead: true }));
    renderHome();

    for (const label of ["Daily Rituals", "Story Engine", "Power Tools", "Awards", "Handbook"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
