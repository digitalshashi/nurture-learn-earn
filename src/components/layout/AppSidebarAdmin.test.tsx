import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";

// Hoisted so the vi.mock factories below — which run before imports — can read
// it, and each test can vary the role and permissions it describes.
const auth = vi.hoisted(() => ({
  roles: [] as string[],
  allow: ((_key: string) => true) as (key: string) => boolean,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ hasRole: (role: string) => auth.roles.includes(role) }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    hasPermission: (key: string) => auth.allow(key),
    permissions: {},
    loading: false,
  }),
}));

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

function links() {
  const { container } = render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <SidebarProvider defaultOpen persistState={false}>
        <AppSidebar />
      </SidebarProvider>
    </MemoryRouter>,
  );
  return Array.from(container.querySelectorAll("a")).map((a) => ({
    text: a.textContent?.trim() ?? "",
    href: a.getAttribute("href") ?? "",
  }));
}

const WORKSPACE = ["/settings/team", "/settings/roles", "/settings/security", "/settings/platform"];

describe("sidebar administration", () => {
  beforeEach(() => {
    auth.roles = [];
    auth.allow = () => true;
  });

  it("gives a coach their own workspace administration screens", () => {
    // A coach runs an academy. These pages already accepted them; they were
    // just buried under Settings, which is where the report came from.
    const hrefs = links().map((l) => l.href);
    for (const url of WORKSPACE) expect(hrefs).toContain(url);
  });

  it("does not offer a coach the platform panels", () => {
    // /admin can assign super_admin, so putting it in front of every coach
    // would let any of them promote themselves.
    const hrefs = links().map((l) => l.href);
    expect(hrefs).not.toContain("/admin");
    expect(hrefs).not.toContain("/super-admin");
  });

  it("hides a workspace link the person has no permission for", () => {
    // The link is gated on the same key its route is, so it can never lead to
    // a page that refuses on arrival.
    auth.allow = (key) => key !== "security_settings";
    const hrefs = links().map((l) => l.href);

    expect(hrefs).not.toContain("/settings/security");
    expect(hrefs).toContain("/settings/team");
  });

  it("gives an admin the admin panel but not the super admin one", () => {
    // Super admin is the higher tier. An admin seeing it made the two roles
    // look identical in the nav.
    auth.roles = ["admin"];
    const hrefs = links().map((l) => l.href);

    expect(hrefs).toContain("/admin");
    expect(hrefs).not.toContain("/super-admin");
  });

  it("gives a super admin both panels", () => {
    auth.roles = ["super_admin"];
    const hrefs = links().map((l) => l.href);

    expect(hrefs).toContain("/admin");
    expect(hrefs).toContain("/super-admin");
  });

  it("guards the super admin page on the same role the sidebar does", () => {
    // Hiding the entry while the route still admits an admin would leave the
    // tier holding only until somebody types the URL.
    const page = readFileSync("src/pages/SuperAdmin.tsx", "utf8");
    expect(page).toContain(`if (!hasRole("super_admin"))`);
    expect(page).not.toContain(`!hasRole("admin") && !hasRole("super_admin")`);
  });

  it("shows one Administration heading, not two, for someone who is both", () => {
    auth.roles = ["coach", "admin"];
    const { container } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <SidebarProvider defaultOpen persistState={false}>
          <AppSidebar />
        </SidebarProvider>
      </MemoryRouter>,
    );

    const headings = Array.from(container.querySelectorAll("*"))
      .filter((el) => el.children.length === 0)
      .filter((el) => el.textContent?.trim() === "Administration");

    expect(headings).toHaveLength(1);
  });
});
