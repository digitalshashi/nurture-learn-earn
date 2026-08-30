import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Stops the dollar sign creeping back.
 *
 * Every money affordance used lucide's DollarSign and every total formatted
 * against whatever currency happened to sit on the first database row, so an
 * INR workspace still showed "$" on its earnings page.
 */

const sourceFiles = (() => {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p);
    }
  };
  walk("src/pages");
  walk("src/components");
  return out;
})();

const read = (f: string) => readFileSync(f, "utf8");

describe("currency coverage", () => {
  it("shows no hardcoded USD/INR ternary anywhere", () => {
    const offenders = sourceFiles.filter((f) => /currency === "USD"\s*\?/.test(read(f)));
    expect(offenders, `still branching on USD:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("uses the currency-aware icon rather than DollarSign for money", () => {
    // CurrencyIcon itself maps the glyphs, so it is the one allowed reference.
    const offenders = sourceFiles.filter(
      (f) => !f.includes("CurrencyIcon") && /<DollarSign[\s/>]/.test(read(f)),
    );
    expect(offenders, `hardcoded dollar glyph in:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("derives Sales totals from the workspace currency, not a row", () => {
    // transactions[0].currency reflects whatever the first sale was priced in,
    // which is not what the workspace has chosen to display.
    for (const page of [
      "src/pages/SalesEarnings.tsx",
      "src/pages/SalesTransactions.tsx",
      "src/pages/SalesWithdrawals.tsx",
      "src/pages/SalesSubscriptions.tsx",
    ]) {
      const src = read(page);
      expect(src, `${page} should use useCurrency()`).toContain("useCurrency()");
      expect(src, `${page} still reads a row's currency`).not.toMatch(
        /currency = (transactions|rows)\[0\]/,
      );
    }
  });

  it("gives the email sender a symbol and a formatter", () => {
    const sender = readFileSync("supabase/functions/send-templated-email/index.ts", "utf8");
    expect(sender).toContain("currency_symbol");
    expect(sender).toContain("formatMoneyForEmail");
    // The workspace setting, not a hardcoded default.
    expect(sender).toContain("coachCurrency(");
  });

  it("keeps the email formatter aligned with the app's currencies", () => {
    const shared = readFileSync("supabase/functions/_shared/email.ts", "utf8");
    for (const code of ["INR", "EUR", "USD"]) {
      expect(shared, `email formatter is missing ${code}`).toContain(`${code}: {`);
    }
    expect(shared).toContain("₹");
    expect(shared).toContain("€");
  });

  it("defaults the email formatter to rupees, matching the app", () => {
    const shared = readFileSync("supabase/functions/_shared/email.ts", "utf8");
    expect(shared).toMatch(/\?\?\s*"INR"/);
  });
});
