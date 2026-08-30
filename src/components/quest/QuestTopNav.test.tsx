import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QuestTopNav } from "./QuestTopNav";
import { QUEST_NAV_ITEMS } from "@/lib/quest/nav";
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
 * The section nav moved out of a left rail and into a strip across the top,
 * because the app already has a sidebar and two of them crowded the page.
 * These pin the things that move easily in that kind of change: that every
 * destination survived, and that the rail's status card came with it.
 */

const questValue = vi.fn();
vi.mock("@/contexts/QuestContext", () => ({ useQuest: () => questValue() }));

function buildQuest({ unlocked = false, loading = false, ritualsLeft = 0 } = {}) {
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
  const rituals = Array.from({ length: ritualsLeft }, (_, i) => ({ id: `r${i}` }));
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
    loading,
    degraded: false,
    refresh: vi.fn(),
    displayName: "Asha Rao",
    firstName: "Asha",
    avatarUrl: null,
    questProfile: null,
    handbookRead: new Set<string>(),
    rituals,
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
      potency: 0,
      storiesPublished: 0,
      commentsLeft: 0,
    }),
    awards,
    awardLevel: currentAwardLevel(awards),
  };
}

const renderNav = (path = "/quest") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <QuestTopNav />
    </MemoryRouter>,
  );

beforeEach(() => questValue.mockReset());

/**
 * Tab queries are scoped to the strip.
 *
 * The status chip beside it is also a button and its copy mentions the same
 * screens ("…then the handbook"), so an unscoped query by name matches two
 * things and the test fails for a reason that has nothing to do with the nav.
 */
const tabs = () => within(screen.getByRole("navigation", { name: /Quest sections/i }));

/**
 * Opens a group's menu by keyboard.
 *
 * Radix opens on pointerdown, and jsdom ships no PointerEvent — the trigger's
 * Enter handler is the route into the menu that does not need a polyfill.
 */
function openGroup(label: string) {
  fireEvent.keyDown(tabs().getByRole("button", { name: new RegExp(label, "i") }), { key: "Enter" });
  return within(screen.getByRole("menu"));
}

describe("the strip carries the whole section", () => {
  it("puts the two groups behind their own triggers", () => {
    questValue.mockReturnValue(buildQuest({ unlocked: true }));
    renderNav();

    for (const label of ["Home", "Hackathon", "Grow", "Community", "Handbook", "Support"]) {
      expect(tabs().getByRole("button", { name: new RegExp(label, "i") })).toBeInTheDocument();
    }
    // Six triggers, not eleven: the grouped screens live in the menus.
    expect(tabs().getAllByRole("button")).toHaveLength(6);
  });

  it("reaches every destination the rail used to hold", () => {
    questValue.mockReturnValue(buildQuest({ unlocked: true }));
    renderNav();

    const reachable = new Set(
      tabs()
        .getAllByRole("button")
        .map((button) => button.textContent ?? ""),
    );
    for (const label of ["Grow", "Community"]) {
      openGroup(label)
        .getAllByRole("menuitem")
        .forEach((entry) => reachable.add(entry.textContent ?? ""));
      fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    }

    for (const item of QUEST_NAV_ITEMS) {
      expect([...reachable].some((text) => text.includes(item.label))).toBe(true);
    }
  });

  it("lists a group's screens with their descriptions", () => {
    questValue.mockReturnValue(buildQuest({ unlocked: true }));
    renderNav();

    const menu = openGroup("Grow");
    for (const label of ["Daily Rituals", "Story Engine", "Power Tools"]) {
      expect(menu.getByText(label)).toBeInTheDocument();
    }
    expect(menu.getByText(/Seven small practices, one streak/i)).toBeInTheDocument();
  });

  it("lights the group trigger when the current screen is inside it", () => {
    questValue.mockReturnValue(buildQuest({ unlocked: true }));
    renderNav("/quest/power-tools");

    // Power Tools' own tab is inside the menu, so without this the strip would
    // show no active tab at all on three of the eleven screens.
    const current = screen.getAllByRole("button", { current: "page" });
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAccessibleName(/Grow/i);
  });

  it("marks which screen in the menu is the current one", () => {
    questValue.mockReturnValue(buildQuest({ unlocked: true }));
    renderNav("/quest/power-tools");

    const entry = openGroup("Grow").getByRole("menuitem", { name: /Power Tools/i });
    expect(entry.className).toMatch(/text-accent/);
  });

  it("resolves a nested path to its section", () => {
    questValue.mockReturnValue(buildQuest({ unlocked: true }));
    renderNav("/quest/handbook?s=welcome");

    expect(screen.getAllByRole("button", { current: "page" })[0]).toHaveAccessibleName(/Handbook/i);
  });
});

describe("locking", () => {
  it("padlocks a group whose every screen is shut", () => {
    questValue.mockReturnValue(buildQuest({ unlocked: false }));
    renderNav();

    // Dimmed and padlocked, but still on screen and still openable — the
    // ladder has to stay visible.
    const grow = tabs().getByRole("button", { name: /Grow/i });
    expect(grow).not.toBeDisabled();
    expect(grow.querySelector("svg.lucide-lock")).toBeTruthy();
  });

  it("padlocks the individual screens inside the menu too", () => {
    questValue.mockReturnValue(buildQuest({ unlocked: false }));
    renderNav();

    const entry = openGroup("Grow").getByRole("menuitem", { name: /Daily Rituals/i });
    expect(entry.querySelector("svg.lucide-lock")).toBeTruthy();
  });

  it("leaves the ways through the gate unlocked", () => {
    questValue.mockReturnValue(buildQuest({ unlocked: false }));
    renderNav();

    for (const label of ["Handbook", "Support"]) {
      const tab = tabs().getByRole("button", { name: new RegExp(label, "i") });
      expect(tab.querySelector("svg.lucide-lock")).toBeNull();
    }
  });

  it("shows no padlocks at all while the gate state is still loading", () => {
    // Otherwise every gated tab flashes a lock and then loses it.
    questValue.mockReturnValue(buildQuest({ unlocked: false, loading: true }));
    const { container } = renderNav();

    expect(container.querySelectorAll("nav svg.lucide-lock")).toHaveLength(0);
  });
});

describe("the status slot", () => {
  it("shows the gate's progress while it is shut", () => {
    questValue.mockReturnValue(buildQuest({ unlocked: false }));
    renderNav();

    expect(screen.getByText("Unlock the Command Centre")).toBeInTheDocument();
    expect(screen.getByText("0 of 2 steps")).toBeInTheDocument();
  });

  it("swaps to live context once the gate is open", () => {
    questValue.mockReturnValue(buildQuest({ unlocked: true, ritualsLeft: 3 }));
    renderNav();

    expect(screen.queryByText("Unlock the Command Centre")).not.toBeInTheDocument();
    expect(screen.getByText("3 rituals left")).toBeInTheDocument();
  });

  it("keeps the membership tier the rail footer used to show", () => {
    questValue.mockReturnValue(buildQuest({ unlocked: true }));
    renderNav();

    expect(screen.getByText("Member")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Quest profile settings/i })).toBeInTheDocument();
  });
});
