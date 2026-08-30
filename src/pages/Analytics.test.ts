import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync("src/pages/Analytics.tsx", "utf8");
const hooks = readFileSync("src/hooks/useAnalytics.ts", "utf8");

describe("the analytics page reports real data", () => {
  it("has no invented numbers left in it", () => {
    // The page used to ship a hardcoded 12,485 visits, an 8.4% conversion rate
    // and $24,580 of revenue, for every account, forever.
    expect(page).not.toMatch(/12,485|24,580|8\.4%|3,241|1,049/);
    expect(page).not.toMatch(/const visitData\s*=/);
    expect(page).not.toMatch(/const conversionData\s*=/);
    expect(page).not.toMatch(/const metrics\s*=\s*\[/);
  });

  it("has no placeholder tabs promising work that never happened", () => {
    expect(page).not.toMatch(/coming soon/i);
  });

  it("reads its numbers from the database", () => {
    for (const table of [
      "transactions",
      "analytics_events",
      "enrollments",
      "chapter_progress",
      "event_registrations",
      "xp_transactions",
      "service_users",
      "coach_subscriptions",
      "login_sessions",
    ]) {
      expect(hooks, table).toContain(`from("${table}")`);
    }
  });

  it("never hardcodes a currency symbol", () => {
    // The platform currency is configurable, and analytics showing dollars to
    // a coach charging rupees was the whole point of that work.
    expect(page).not.toMatch(/\$\{?\d/);
    expect(page).toContain("useCurrency");
  });
});

describe("analytics is scoped to who is looking", () => {
  it("gives a student, a coach and an admin different views", () => {
    expect(page).toContain("StudentView");
    expect(page).toContain("CoachView");
    expect(page).toContain("PlatformView");
  });

  it("decides the scope from the viewer's role, not from a prop", () => {
    expect(page).toMatch(/hasRole\("admin"\)\s*\|\|\s*hasRole\("super_admin"\)/);
    expect(page).toContain('hasRole("coach")');
  });

  it("scopes a coach's queries to their own id", () => {
    // A coach must never see another tenant's rows, whatever RLS also says.
    expect(hooks).toContain('.eq("coach_id", coachId)');
    expect(hooks).toContain('.eq("user_id", userId)');
  });

  it("reaches across tenants only in the platform loader", () => {
    const coachLoader = hooks.slice(
      hooks.indexOf("export function useCoachAnalytics"),
      hooks.indexOf("export interface StudentAnalytics"),
    );
    // Every table the coach loader touches is filtered; none is fetched whole.
    expect(coachLoader).not.toMatch(/from\("transactions"\)\s*\n\s*\.select\([^)]*\)\s*\n\s*\.gte/);
  });
});

describe("the window is honest", () => {
  it("fetches the previous window too, so trends compare like with like", () => {
    expect(hooks).toContain("const { previousFrom } = windowFor(RANGES[range]);");
  });

  it("filters at the database rather than downloading everything", () => {
    // A coach with three years of history should not fetch all of it to draw
    // a seven-day chart.
    expect(hooks).toContain('.gte("occurred_at", since)');
    expect(hooks).toContain('.gte("created_at", since)');
  });

  it("keeps the chosen range in the URL", () => {
    expect(page).toContain('params.get("range")');
    expect(page).toContain("isRangeKey");
  });
});
