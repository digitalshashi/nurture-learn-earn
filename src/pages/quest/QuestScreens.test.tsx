import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  gateState,
  handbookState,
  momentumMeter,
  profileState,
  toolChainState,
} from "@/lib/quest/progress";
import { awardLadder, currentAwardLevel } from "@/lib/quest/awards";
import { HANDBOOK_SECTIONS } from "@/lib/quest/handbook";

/**
 * Every Quest screen, rendered once in each of its two big states.
 *
 * The point is the states, not the pixels: each of these pages branches on
 * whether the gate is open, and a page that throws on one of those branches
 * typechecks perfectly. The data layer is stubbed; the progress maths is real.
 */

// A chainable stand-in for the Supabase query builder. Every method returns
// itself, and awaiting anywhere in the chain yields an empty result.
const emptyResult = { data: [], error: null, count: 0 };
function queryStub(): unknown {
  return new Proxy(
    {},
    {
      get(_target, property) {
        if (property === "then") {
          return (resolve: (value: typeof emptyResult) => unknown) => resolve(emptyResult);
        }
        return () => queryStub();
      },
    },
  );
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => queryStub(),
    rpc: () => Promise.resolve({ data: null, error: null }),
    storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
  },
}));

// One user object for the life of the module. A fresh one per call would
// change identity on every render, which is exactly what the real provider
// does not do.
vi.mock("@/contexts/AuthContext", () => {
  const user = { id: "u1", email: "asha@example.test" };
  return { useAuth: () => ({ user, hasRole: () => false }) };
});

const questValue = vi.fn();
vi.mock("@/contexts/QuestContext", () => ({
  useQuest: () => questValue(),
}));

function buildQuest(unlocked: boolean) {
  const profile = profileState(
    unlocked
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
  const handbook = handbookState(unlocked ? HANDBOOK_SECTIONS.map((s) => s.key) : []);
  const gate = gateState(profile, handbook);
  const tools = toolChainState([]);
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
    handbookRead: new Set<string>(unlocked ? HANDBOOK_SECTIONS.map((s) => s.key) : []),
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
    momentum: momentumMeter({
      gate,
      currentStreak: 0,
      potency: tools.potency,
      storiesPublished: 0,
      commentsLeft: 0,
    }),
    awards,
    awardLevel: currentAwardLevel(awards),
  };
}

const SCREENS = [
  { name: "Profile setup", load: () => import("./QuestProfileSetup"), gated: false },
  { name: "Handbook", load: () => import("./QuestHandbook"), gated: false },
  { name: "Support", load: () => import("./QuestSupport"), gated: false },
  { name: "Daily Rituals", load: () => import("./QuestRituals"), gated: false },
  { name: "Story Engine", load: () => import("./QuestStories"), gated: true },
  { name: "Power Tools", load: () => import("./QuestPowerTools"), gated: true },
  { name: "Awards", load: () => import("./QuestAwards"), gated: true },
  { name: "Leaderboard", load: () => import("./QuestLeaderboard"), gated: true },
  { name: "Certificates", load: () => import("./QuestCertificates"), gated: true },
  { name: "Hackathon", load: () => import("./QuestHackathon"), gated: true },
];

beforeEach(() => questValue.mockReset());

/** Awaited inside act so the pages' first data effects settle before asserting. */
async function renderPage(load: () => Promise<{ default: () => JSX.Element }>) {
  const { default: Page } = await load();
  let view: ReturnType<typeof render> | undefined;
  await act(async () => {
    view = render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    );
  });
  return view!;
}

describe("with the gate open", () => {
  for (const screenUnderTest of SCREENS) {
    it(`renders ${screenUnderTest.name}`, async () => {
      questValue.mockReturnValue(buildQuest(true));
      const { container } = await renderPage(screenUnderTest.load);
      expect(container.firstChild).toBeTruthy();
    });
  }
});

describe("with the gate still shut", () => {
  for (const screenUnderTest of SCREENS) {
    it(`renders ${screenUnderTest.name}`, async () => {
      questValue.mockReturnValue(buildQuest(false));
      await renderPage(screenUnderTest.load);

      // A gated screen must say it is shut rather than render an empty page —
      // and the ones a member needs *to get through* the gate must not.
      const locked = screen.queryByText(/opens? after setup/i);
      expect(!!locked).toBe(screenUnderTest.gated);
    });
  }
});
