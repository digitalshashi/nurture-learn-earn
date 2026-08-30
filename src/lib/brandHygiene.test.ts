import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { BRAND } from "./brand";

/**
 * Nobody else's name on this product.
 *
 * Content gets pasted in from other tools — a support hub, a template, a page
 * of copy — and it arrives carrying the brand it was written for. That has
 * happened twice: Lovable in the scaffolding, and ILH throughout the Support
 * page, where it reached as far as stamping every certificate id.
 */

/** Names that should never appear in shipped code or content. */
const FOREIGN_BRANDS = [
  "lovable",
  "tagmango",
  "ilh",
  "exly",
  "kajabi",
  "teachable",
  "thinkific",
  "graphy",
  "classplus",
  "learnyst",
  "spayee",
];

/** Every file under a directory, with the given extensions. */
function walk(dir: string, extensions: string[]): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;

    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      found.push(...walk(path, extensions));
    } else if (extensions.some((ext) => entry.endsWith(ext))) {
      found.push(path);
    }
  }

  return found;
}

describe("no other product's name ships in this one", () => {
  // The code that runs and the content it serves. Applied migrations are
  // history and are checked separately below — rewriting one would make the
  // file disagree with what actually ran.
  const files = [
    ...walk("src", [".ts", ".tsx"]),
    ...walk("supabase/functions", [".ts"]),
  ].filter((path) => !path.endsWith("brandHygiene.test.ts"));

  it("has no foreign brand in any source file", () => {
    const offenders: string[] = [];

    for (const path of files) {
      // Quoted domain suffixes are addresses, not claims. isPlatformHost has
      // to know ".lovable.app" is a preview host and not a tenant custom
      // domain; deleting that string would break the check, and keeping it
      // asserts nothing about whose product this is.
      const source = readFileSync(path, "utf8").replace(/"\.[a-z0-9.-]+"/gi, "");
      for (const brand of FOREIGN_BRANDS) {
        // Word boundaries: "graphy" must not match "typography", and "ilh"
        // must not match a hash or an identifier that happens to contain it.
        if (new RegExp(`\\b${brand}\\b`, "i").test(source)) {
          offenders.push(`${path}: ${brand}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("names itself from one place rather than by hand", () => {
    // A hardcoded product name is how a rename half-happens.
    expect(BRAND.name).toBeTruthy();
    expect(BRAND.displayName).toBeTruthy();
  });
});

describe("the support hub carries no borrowed branding", () => {
  const seed = readFileSync("supabase/migrations/20260731200000_support_page.sql", "utf8");

  it("has no ILH left in the seeded content", () => {
    // The seed still runs on a fresh install, so fixing only the live database
    // would put it straight back on the next deployment.
    expect(seed).not.toMatch(/\bILH\b/i);
    expect(seed).not.toContain("ilh-community");
  });
});

describe("certificates are not stamped with anyone's brand", () => {
  const fix = readFileSync(
    "supabase/migrations/20260830200000_remove_ilh_branding.sql",
    "utf8",
  );

  it("replaces the id generator rather than leaving the old one live", () => {
    expect(fix).toContain("CREATE OR REPLACE FUNCTION public.generate_certificate_id");
    expect(fix).toContain("'CERT-'");
  });

  it("uses a neutral prefix, not this platform's brand either", () => {
    // A certificate is awarded by the coach's academy, not by the platform
    // underneath it. Stamping our own name there is the same mistake as ILH.
    // Checked against the function body, not the file: the comment above it
    // names the prefix it rejected.
    const body = fix.slice(fix.indexOf("CREATE OR REPLACE FUNCTION"));
    expect(body).not.toMatch(/1corehub|1CH-/i);
  });

  it("leaves ids that were already issued alone", () => {
    // They are identifiers people have shared and may be checked against.
    expect(fix).not.toMatch(/UPDATE\s+public\.issued_certificates/i);
  });
});
