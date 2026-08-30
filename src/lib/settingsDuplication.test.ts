import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { SETTINGS_GROUPS } from "./settingsNav";

/**
 * Guards against the same setting appearing in two places.
 *
 * Two screens writing one table is not a style problem: navigation_menu was
 * edited both by a "Customise Menu" tab and by the Navigation Settings page,
 * with incompatible strategies — the tab deleted every row and re-inserted
 * while the page diffed — so whichever was saved last silently discarded the
 * other's work.
 */

const SETTINGS_FILES = [
  "src/pages/SettingsPage.tsx",
  "src/pages/PlatformSettings.tsx",
  "src/pages/NavigationSettings.tsx",
  "src/pages/EmailSettings.tsx",
  "src/pages/SecuritySettings.tsx",
  "src/pages/TeamManagement.tsx",
  "src/pages/CloudStorage.tsx",
  "src/pages/RolePermissions.tsx",
  "src/pages/MyAccount.tsx",
  "src/pages/Billing.tsx",
];

const componentFiles = (() => {
  const dir = "src/components/settings";
  try {
    return readdirSync(dir)
      .filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f))
      .map((f) => join(dir, f));
  } catch {
    return [];
  }
})();

const allFiles = [...SETTINGS_FILES, ...componentFiles].filter((f) => {
  try {
    return statSync(f).isFile();
  } catch {
    return false;
  }
});

/** Tables each settings screen writes to. */
function writersByTable(): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const file of allFiles) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(
      /\.from\(\s*"([a-z_]+)"[^)]*\)\s*\n?\s*\.(insert|update|upsert|delete)/g,
    )) {
      const set = map.get(m[1]) ?? new Set<string>();
      set.add(basename(file));
      map.set(m[1], set);
    }
  }
  return map;
}

describe("settings duplication", () => {
  it("has only one settings screen writing each table", () => {
    const offenders = [...writersByTable().entries()]
      .filter(([, writers]) => writers.size > 1)
      .map(([table, writers]) => `${table}: ${[...writers].join(", ")}`);

    expect(offenders, `two settings screens edit the same data:\n${offenders.join("\n")}`).toEqual(
      [],
    );
  });

  it("no longer ships the menu editor that fought Navigation Settings", () => {
    const stillThere = componentFiles.some((f) => basename(f) === "CustomiseMenuTab.tsx");
    expect(stillThere).toBe(false);
  });

  it("keeps navigation_menu owned by exactly one screen", () => {
    const owners = writersByTable().get("navigation_menu");
    expect([...(owners ?? [])]).toEqual(["NavigationSettings.tsx"]);
  });

  it("sets currency in one place only", () => {
    // default_currency was written by a Currency card that nothing read, while
    // the value that governs a charge lives on the gateway.
    const settings = readFileSync("src/pages/SettingsPage.tsx", "utf8");
    expect(settings).not.toContain("default_currency");
  });

  it("points each settings nav entry at a distinct screen", () => {
    const paths = SETTINGS_GROUPS.flatMap((g) => g.items).map((i) => i.to);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("gives each settings nav entry a distinct label", () => {
    const labels = SETTINGS_GROUPS.flatMap((g) => g.items).map((i) => i.label.toLowerCase());
    expect(new Set(labels).size).toBe(labels.length);
  });
});
