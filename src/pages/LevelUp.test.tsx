import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// The page's chrome and its seven data-heavy views are stubbed: this covers the
// navigation contract, not what each section renders.
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// vi.mock factories are hoisted above the module body, so each stub is inlined
// rather than built by a shared helper.
vi.mock("@/components/levelup/LevelUpDashboard", () => ({
  LevelUpDashboard: () => <div>Dashboard view</div>,
}));
vi.mock("@/components/levelup/LevelUpHabits", () => ({
  LevelUpHabits: () => <div>Habits view</div>,
}));
vi.mock("@/components/levelup/LevelUpTasks", () => ({
  LevelUpTasks: () => <div>Tasks view</div>,
}));
vi.mock("@/components/levelup/LevelUpChallenges", () => ({
  LevelUpChallenges: () => <div>Challenges view</div>,
}));
vi.mock("@/components/levelup/LevelUpData", () => ({
  LevelUpData: () => <div>Data view</div>,
}));
vi.mock("@/components/levelup/LevelUpCheckup", () => ({
  LevelUpCheckup: () => <div>Checkup view</div>,
}));
vi.mock("@/components/levelup/LevelUpCharity", () => ({
  LevelUpCharity: () => <div>Charity view</div>,
}));

import LevelUp from "./LevelUp";

const renderAt = (path = "/levelup") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <LevelUp />
    </MemoryRouter>,
  );

describe("LevelUp navigation", () => {
  it("renders no secondary sidebar — the app already provides one", () => {
    const { container } = renderAt();
    expect(container.querySelector("aside")).toBeNull();
  });

  it("exposes every section in one horizontal tab strip", () => {
    renderAt();
    const nav = screen.getByRole("navigation", { name: /level up sections/i });
    for (const label of ["Dashboard", "Habits", "Tasks", "Challenges", "Data", "Checkup", "Charity"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    // Scrolls rather than wrapping or squeezing the content on small screens.
    expect(nav.className).toContain("overflow-x-auto");
  });

  it("opens on the dashboard", () => {
    renderAt();
    expect(screen.getByText("Dashboard view")).toBeInTheDocument();
  });

  it("switches sections on click", () => {
    renderAt();

    fireEvent.click(screen.getByRole("button", { name: "Habits" }));
    expect(screen.getByText("Habits view")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard view")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Charity" }));
    expect(screen.getByText("Charity view")).toBeInTheDocument();
  });

  it("marks the active tab for assistive tech", () => {
    renderAt();
    fireEvent.click(screen.getByRole("button", { name: "Tasks" }));

    expect(screen.getByRole("button", { name: "Tasks" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Habits" })).not.toHaveAttribute("aria-current");
  });

  it("restores the section from the url so a refresh keeps your place", () => {
    renderAt("/levelup?view=checkup");
    expect(screen.getByText("Checkup view")).toBeInTheDocument();
  });

  it("falls back to the dashboard for an unknown view param", () => {
    renderAt("/levelup?view=bogus");
    expect(screen.getByText("Dashboard view")).toBeInTheDocument();
  });
});
