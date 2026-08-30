import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";

const state = {
  totalTasks: 0,
  completedTasks: 0,
  totalChallenges: 0,
  completedChallenges: 0,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

vi.mock("@/integrations/supabase/client", () => {
  const countFor = (table: string, filters: Record<string, unknown>) => {
    if (table === "student_tasks") {
      return filters.is_completed === true ? state.completedTasks : state.totalTasks;
    }
    if (table === "challenge_participants") return state.completedChallenges;
    if (table === "gamification_challenges") return state.totalChallenges;
    return 0;
  };

  const from = (table: string) => {
    const filters: Record<string, unknown> = {};
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (col: string, val: unknown) => {
        filters[col] = val;
        return chain;
      },
      gte: () => chain,
      in: () => chain,
      order: () => chain,
      single: () => Promise.resolve({ data: null }),
      maybeSingle: () => Promise.resolve({ data: null }),
      then: (cb: (r: unknown) => unknown) =>
        Promise.resolve({ data: [], count: countFor(table, filters), error: null }).then(cb),
    };
    return chain;
  };

  return { supabase: { from } };
});

import { LevelUpDashboard } from "./LevelUpDashboard";

/** Reads the percentage rendered inside the card whose title matches. */
async function percentFor(title: string) {
  const heading = await screen.findByText(title);
  const card = heading.closest("div")!.parentElement!;
  return within(card).getByText(/%$/).textContent;
}

describe("LevelUpDashboard task/challenge stats", () => {
  it("shows a real task completion rate, not the count divided by itself", async () => {
    // The old expression was (completed / max(completed,1)) * 100, which is
    // always 100% whenever any task was completed, whatever the total.
    state.totalTasks = 8;
    state.completedTasks = 2;
    state.totalChallenges = 0;
    state.completedChallenges = 0;

    render(<LevelUpDashboard />);

    await waitFor(async () => expect(await percentFor("Task")).toBe("25%"));
  });

  it("reports 0% rather than dividing by zero when there are no tasks", async () => {
    state.totalTasks = 0;
    state.completedTasks = 0;

    render(<LevelUpDashboard />);

    await waitFor(async () => expect(await percentFor("Task")).toBe("0%"));
  });

  it("shows a challenge completion rate instead of a hardcoded 0 XP", async () => {
    state.totalTasks = 0;
    state.completedTasks = 0;
    state.totalChallenges = 4;
    state.completedChallenges = 3;

    render(<LevelUpDashboard />);

    await waitFor(async () => expect(await percentFor("Challenge")).toBe("75%"));

    // The card itself must no longer carry the hardcoded XP figure. (The Habit
    // card above legitimately shows a 🪙 XP total from real data, so this has
    // to be scoped rather than checked page-wide.)
    const card = screen.getByText("Challenge").closest("div")!.parentElement!;
    expect(within(card).queryByText(/XP/)).toBeNull();
  });
});
