import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const auth = { roles: [] as string[] };
const perms = { allow: true };

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ hasRole: (r: string) => auth.roles.includes(r) }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ hasPermission: () => perms.allow, permissions: {}, loading: false }),
}));

import { SettingsShell } from "./SettingsShell";

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <SettingsShell>
        <div>page body</div>
      </SettingsShell>
    </MemoryRouter>,
  );

beforeEach(() => {
  auth.roles = [];
  perms.allow = true;
});

describe("SettingsShell", () => {
  it("renders the page it wraps", () => {
    renderAt("/settings");
    expect(screen.getByText("page body")).toBeInTheDocument();
  });

  it("shows the section list", () => {
    renderAt("/settings");
    expect(screen.getByRole("navigation", { name: /settings sections/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /My account/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Payment gateways/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Security/ })).toBeInTheDocument();
  });

  it("highlights each /settings tab separately", () => {
    renderAt("/settings?tab=ai");
    expect(screen.getByRole("button", { name: /AI provider/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: /Payment gateways/ })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("marks the current section for assistive tech", () => {
    renderAt("/settings/security");
    expect(screen.getByRole("button", { name: /Security/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: /My account/ })).not.toHaveAttribute("aria-current");
  });

  it("describes the active section in the header", () => {
    renderAt("/settings/team");
    expect(screen.getByText(/Invite teammates/i)).toBeInTheDocument();
  });

  it("no longer lists the admin screens — they are sidebar entries now", () => {
    auth.roles = ["super_admin"];
    renderAt("/settings");
    expect(screen.queryByRole("button", { name: /Admin panel/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Super admin/ })).toBeNull();
  });

  it("no longer lists Refer & earn", () => {
    renderAt("/settings");
    expect(screen.queryByRole("button", { name: /Refer/ })).toBeNull();
  });

  it("drops sections the user has no permission for", () => {
    perms.allow = false;
    renderAt("/settings");
    expect(screen.queryByRole("button", { name: /Branding/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Payment gateways/ })).toBeNull();
    // Your own account is deliberately ungated — everyone can reach it.
    expect(screen.getByRole("button", { name: /My account/ })).toBeInTheDocument();
  });
});
