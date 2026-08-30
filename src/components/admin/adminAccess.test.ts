import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("super admin inherits admin", () => {
  const migration = read(
    "supabase/migrations/20260829090000_super_admin_inherits_admin.sql",
  );

  it("answers yes to has_role('admin') for a super admin", () => {
    // Dozens of policies were written as has_role(uid,'admin') and never
    // mentioned super_admin, so a super-admin-only account read nothing: no
    // plans, no subscriptions, and only its own row from user_roles — which is
    // why the admin screens rendered empty rather than erroring.
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.has_role");
    expect(migration.replace(/\s+/g, " ")).toContain(
      "OR (_role = 'admin' AND role = 'super_admin')",
    );
  });

  it("leaves every other role exact", () => {
    // Only admin is inherited: coach and student must stay literal, or the
    // permission matrix stops meaning anything.
    const inheritances = migration.match(/_role = '(\w+)' AND role = '(\w+)'/g) ?? [];
    expect(inheritances).toEqual(["_role = 'admin' AND role = 'super_admin'"]);
  });

  it("lets an admin read the whole roster, not just their own row", () => {
    expect(migration).toContain("Admins can view all roles");
    expect(migration).toContain("FOR SELECT");
  });
});

describe("admin navigation matches the page guards", () => {
  const sidebar = read("src/components/layout/AppSidebar.tsx");

  it("does not offer coaches an admin panel that rejects them", () => {
    // The sidebar used to show "Admin panel" to coaches while AdminPanel
    // required admin, so clicking it produced "Admin access required" — which
    // reads as a broken page rather than as one that is not yours.
    const canSeeAdmin = sidebar.match(/const canSeeAdmin = [^;]+;/)?.[0] ?? "";
    expect(canSeeAdmin).toBeTruthy();
    expect(canSeeAdmin).not.toContain('hasRole("coach")');
    expect(canSeeAdmin).toContain('hasRole("admin")');
    expect(canSeeAdmin).toContain('hasRole("super_admin")');
  });
});

describe("settings were shared with the admin screens, not moved off them", () => {
  // The brief was to shuffle role-shaped settings onto the admin pages without
  // removing anything, so each panel has to have exactly two homes.
  const PANELS = [
    {
      panel: "src/components/admin/RolePermissionsPanel.tsx",
      export: "RolePermissionsPanel",
      route: "src/pages/RolePermissions.tsx",
    },
    {
      panel: "src/components/admin/PlatformSettingsPanel.tsx",
      export: "PlatformSettingsPanel",
      route: "src/pages/PlatformSettings.tsx",
    },
    {
      panel: "src/components/admin/SecuritySettingsPanel.tsx",
      export: "SecuritySettingsPanel",
      route: "src/pages/SecuritySettings.tsx",
    },
  ];

  it("keeps every standalone Settings route working", () => {
    for (const { panel, export: name, route } of PANELS) {
      expect(read(panel), panel).toContain(`export function ${name}`);
      expect(read(route), route).toContain(name);
    }
  });

  it("hosts the same panels on the admin screens", () => {
    const admin = read("src/pages/AdminPanel.tsx");
    expect(admin).toContain("RolePermissionsPanel");
    expect(admin).toContain("PlatformSettingsPanel");
    expect(admin).toContain("SecuritySettingsPanel");

    const superAdmin = read("src/pages/SuperAdmin.tsx");
    expect(superAdmin).toContain("PlatformSettingsPanel");
    expect(superAdmin).toContain("RolePermissionsPanel");
    // The login OTP template is platform-level, so it belongs here.
    expect(superAdmin).toContain("EmailTemplatesTab isAdmin");
  });

  it("gives nested panels their own URL slot", () => {
    // Two tab strips on one screen sharing ?tab= would fight: choosing an
    // inner section would silently switch the outer one.
    for (const { panel } of PANELS.filter((p) => !p.panel.includes("RolePermissions"))) {
      expect(read(panel), panel).toContain('param = "section"');
    }
  });

  it("leaves no panel orphaned in components/admin", () => {
    const files = readdirSync("src/components/admin").filter((f) => f.endsWith("Panel.tsx"));
    const hosts = ["src/pages/AdminPanel.tsx", "src/pages/SuperAdmin.tsx"]
      .map(read)
      .join("\n");
    for (const file of files) {
      expect(hosts, file).toContain(file.replace(".tsx", ""));
    }
  });
});
