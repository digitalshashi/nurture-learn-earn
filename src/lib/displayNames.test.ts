import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Everyone in the product has a name other people can see.
 *
 * handle_new_user wrote full_name as COALESCE(metadata->>'full_name', ''), so
 * anyone who signed up without that metadata — a one-time email code, an
 * account made for a buyer at checkout, an imported customer — got an empty
 * string. Every `full_name || "Unknown"` in the app treats '' as missing, so
 * those people appeared as strangers to everyone, including themselves.
 */

const migration = readFileSync(
  "supabase/migrations/20260831020000_profile_display_names.sql",
  "utf8",
);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".") || entry === "node_modules") continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (path.endsWith(".tsx")) out.push(path);
  }
  return out;
}

describe("a blank name cannot reach the screen", () => {
  it("fills one in whenever a profile is written", () => {
    // On the table, not inside handle_new_user: that function is being
    // extended elsewhere, and replacing it whole to change two lines would
    // mean owning every other change made to it.
    expect(migration).toContain("CREATE TRIGGER profiles_fill_display_name");
    expect(migration).toContain("BEFORE INSERT OR UPDATE ON public.profiles");
  });

  it("backfills the people who already had none", () => {
    expect(migration).toContain("UPDATE public.profiles");
    expect(migration).toContain("WHERE btrim(coalesce(full_name, '')) = ''");
  });

  it("never overwrites a name someone actually chose", () => {
    // The backfill is filtered to blanks, and the derivation returns a real
    // name untouched.
    expect(migration).toMatch(/IF btrim\(coalesce\(full_name, ''\)\) <> '' THEN\s*\n\s*RETURN btrim\(full_name\);/);
  });

  it("derives something sayable rather than showing an address", () => {
    expect(migration).toContain("split_part(coalesce(email, ''), '@', 1)");
    expect(migration).toContain("initcap");
  });
});

describe("the app says the same thing when a name is genuinely missing", () => {
  const pages = walk("src");

  it("no longer calls anyone Unknown", () => {
    // "Unknown" next to someone's own post is the version of this people
    // actually complained about.
    const offenders = pages.filter((path) =>
      /full_name[^\n]*\|\|\s*"(Unknown|User)"/.test(readFileSync(path, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
