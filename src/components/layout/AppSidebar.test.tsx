import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ hasRole: () => false }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ hasPermission: () => true, permissions: {}, loading: false }),
}));

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { APP_NAV_SECTIONS } from "@/lib/appNav";

function renderSidebar({ open }: { open: boolean }) {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <SidebarProvider defaultOpen={open} persistState={false}>
        <AppSidebar />
      </SidebarProvider>
    </MemoryRouter>,
  );
}

// The rail is 70px and shows no labels, so each entry leans on its tooltip.
// It carries the same destinations as the open sidebar: standing in for a group
// with one icon hid most of the nav behind a second click, and made the rail a
// different menu from the one people had just been using.
describe("AppSidebar collapsed rail", () => {
  it("shows every destination the open sidebar shows", () => {
    const { container } = renderSidebar({ open: false });

    // Read the rail once: a role query per item is ~40 accessibility-tree
    // walks, which costs more than the assertion is worth.
    const railLinks = new Set(
      Array.from(container.querySelectorAll("a")).map((a) => a.textContent?.trim()),
    );

    for (const section of APP_NAV_SECTIONS) {
      // Role-gated items are absent from both layouts for this user (hasRole
      // is stubbed false), so they say nothing about rail/open parity.
      for (const item of section.items.filter((i) => !i.role)) {
        expect(railLinks).toContain(item.title);
      }
    }
  });

  it("includes the items that used to be hidden inside a group", () => {
    const { container } = renderSidebar({ open: false });

    const railLinks = new Set(
      Array.from(container.querySelectorAll("a")).map((a) => a.textContent?.trim()),
    );

    for (const item of ["Feed", "Messages", "Channels", "Leaderboard", "Coupons"]) {
      expect(railLinks).toContain(item);
    }
  });

  it("stands in for no group with a single entry", () => {
    renderSidebar({ open: false });

    for (const group of ["Community", "Products", "Sales", "CRM", "Marketing"]) {
      expect(screen.queryByRole("button", { name: group })).toBeNull();
    }
  });

  it("points every rail entry at its own route", () => {
    const { container } = renderSidebar({ open: false });

    const hrefByLabel = new Map(
      Array.from(container.querySelectorAll("a")).map((a) => [
        a.textContent?.trim(),
        a.getAttribute("href"),
      ]),
    );

    expect(hrefByLabel.get("Feed")).toBe("/feed");
    expect(hrefByLabel.get("Coupons")).toBe("/marketing/coupons");
  });

  it("keeps Settings reachable from the rail", () => {
    renderSidebar({ open: false });
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
  });
});

describe("AppSidebar expanded", () => {
  it("lists group items directly", () => {
    renderSidebar({ open: true });

    // Community contains the active-ish route group and renders its items.
    fireEvent.click(screen.getByText("Community"));
    expect(screen.getByRole("link", { name: "Feed" })).toBeInTheDocument();
  });

  it("carries no brand mark — the fixed header owns the logo", () => {
    const { container } = renderSidebar({ open: true });
    expect(screen.queryByRole("button", { name: /go to dashboard/i })).toBeNull();
    expect(container.querySelector('img[src="/icon-source.svg"]')).toBeNull();
  });

  it("floats no control over the first nav row — the header owns them", () => {
    const { container } = renderSidebar({ open: true });
    // The collapse handle used to hang off this column's edge, level with the
    // first row; search briefly sat at the top of it. Both moved to the header.
    expect(container.querySelector('[data-sidebar="trigger"]')).toBeNull();
    expect(screen.queryByRole("button", { name: /collapse sidebar/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /expand sidebar/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^search/i })).toBeNull();
  });
});
