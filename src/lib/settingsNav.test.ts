import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  SETTINGS_GROUPS,
  SETTINGS_LINKS,
  SETTINGS_PATHS,
  isSettingsPath,
  matchSettingsItem,
} from "./settingsNav";

const appTsx = readFileSync("src/App.tsx", "utf8");
// The nav definitions were extracted from AppSidebar into src/lib/appNav.ts,
// so both files together are the primary navigation.
const navTsx = readFileSync("src/lib/appNav.ts", "utf8");
const sidebarTsx =
  readFileSync("src/components/layout/AppSidebar.tsx", "utf8") + navTsx;

describe("settings navigation", () => {
  it("points every entry at a route that exists", () => {
    // A typo here would silently orphan a settings screen.
    for (const path of SETTINGS_PATHS) {
      expect(appTsx, `no route for ${path}`).toContain(`path="${path}"`);
    }
  });

  it("lists no duplicate destinations", () => {
    expect(new Set(SETTINGS_LINKS).size).toBe(SETTINGS_LINKS.length);
  });

  it("gives every entry a label, icon and description", () => {
    for (const group of SETTINGS_GROUPS) {
      expect(group.label).toBeTruthy();
      expect(group.items.length).toBeGreaterThan(0);
      for (const item of group.items) {
        expect(item.label).toBeTruthy();
        expect(item.description).toBeTruthy();
        expect(item.icon).toBeTruthy();
      }
    }
  });

  it("does not bury frequently-used screens in Settings", () => {
    // Admin, Super admin and Refer & earn are destinations people open often;
    // reaching them through Settings cost three clicks. They live in the
    // sidebar now, and must not be duplicated here.
    const links = SETTINGS_GROUPS.flatMap((g) => g.items).map((i) => i.to);
    for (const path of ["/admin", "/super-admin", "/referral"]) {
      expect(links, `${path} should not be in Settings`).not.toContain(path);
    }
  });

  it("names the /settings tabs individually instead of one vague entry", () => {
    // /settings is a tabbed grab bag (payments, AI, Zoom). Listing it once as
    // "My Profile" was the original mismatch: it is not a profile screen, and
    // the real one is /my-account.
    const settingsLinks = SETTINGS_LINKS.filter((l) => l.startsWith("/settings?"));
    expect(settingsLinks).toEqual(
      expect.arrayContaining(["/settings?tab=payments", "/settings?tab=ai", "/settings?tab=zoom"]),
    );

    const account = SETTINGS_GROUPS.flatMap((g) => g.items).find((i) => i.label === "My account");
    expect(account?.to).toBe("/my-account");
  });
});

describe("isSettingsPath", () => {
  it("matches every settings destination", () => {
    for (const path of SETTINGS_PATHS) expect(isSettingsPath(path)).toBe(true);
  });

  it("does not claim ordinary pages", () => {
    for (const path of ["/dashboard", "/feed", "/courses", "/levelup", "/"]) {
      expect(isSettingsPath(path)).toBe(false);
    }
  });

  it("does not match on prefix alone", () => {
    expect(isSettingsPath("/settings/roles/some-detail")).toBe(false);
  });
});

describe("matchSettingsItem", () => {
  it("distinguishes the three /settings tabs", () => {
    expect(matchSettingsItem("/settings", "?tab=payments")?.label).toBe("Payment gateways");
    expect(matchSettingsItem("/settings", "?tab=ai")?.label).toBe("AI providers");
    expect(matchSettingsItem("/settings", "?tab=zoom")?.label).toBe("Zoom");
  });

  it("falls back to the first tab when none is given", () => {
    // /settings with no query renders its first tab, so that entry highlights.
    expect(matchSettingsItem("/settings", "")?.to).toBe("/settings?tab=payments");
  });

  it("matches plain pages", () => {
    expect(matchSettingsItem("/settings/team", "")?.label).toBe("Team");
    expect(matchSettingsItem("/my-account", "")?.label).toBe("My account");
  });

  it("returns nothing for a page outside settings", () => {
    expect(matchSettingsItem("/dashboard", "")).toBeUndefined();
  });
});

describe("sidebar no longer carries settings", () => {
  it("keeps configuration screens out of the primary nav", () => {
    // Configuration only. Admin, Super admin and Refer & earn are deliberately
    // back in the sidebar as direct entries.
    //
    // Four screens left this list on purpose. Team, Roles & permissions,
    // Security and Branding are a coach's *administration*, not their
    // preferences: a coach runs an academy and opens them constantly, and
    // burying them under Settings is why the report was that a coach admin had
    // no admin settings at all. They live in the Administration group, beside
    // the platform panels an admin gets, rather than back in the browsing nav.
    const movedOut = ["/settings/cloud", "/billing", "/navigation-settings"];
    for (const path of movedOut) {
      expect(sidebarTsx, `${path} is still in the sidebar`).not.toContain(`"${path}"`);
    }
  });

  it("puts a coach's administration in the Administration group only", () => {
    // Guards the distinction above: these belong to that group, and must not
    // creep back into APP_NAV_SECTIONS, where every role browsing the app
    // would meet them.
    const adminScreens = [
      "/settings/team",
      "/settings/roles",
      "/settings/security",
      "/settings/platform",
    ];
    for (const path of adminScreens) {
      expect(sidebarTsx, `${path} should be a sidebar administration entry`).toContain(
        `"${path}"`,
      );
      expect(navTsx, `${path} does not belong in the browsing nav`).not.toContain(
        `"${path}"`,
      );
    }
  });

  it("still offers a single Settings entry", () => {
    expect(sidebarTsx).toContain(`to="/settings"`);
  });

  it("gives admin, super admin and referrals direct sidebar access", () => {
    expect(sidebarTsx).toContain(`to="/admin"`);
    expect(sidebarTsx).toContain(`to="/super-admin"`);
    // /referral is the affiliates dashboard; Refer & Earn moved to
    // /referral/invite when it took that route over.
    expect(sidebarTsx).toContain(`url: "/referral/invite"`);
  });

  it("keeps the admin entries role-gated in the sidebar", () => {
    // Same audiences as before the move: coaches and up for the admin panel,
    // admins and super admins for super admin.
    expect(sidebarTsx).toContain("const canSeeAdmin =");
    expect(sidebarTsx).toContain("const canSeeSuperAdmin =");
    expect(sidebarTsx).toContain(`hasRole("super_admin")`);
  });
});
