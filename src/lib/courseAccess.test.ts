import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Course content is behind a paywall, and the paywall is row-level security.
 *
 * Three policies had opened it to every account on the platform:
 *
 *   courses   USING (is_published = true OR coach_id = auth.uid())
 *   sections  USING (true)
 *   chapters  USING (true)
 *
 * The first was visible — a super admin's courses turned up in every coach's
 * catalogue. The other two were not: chapters carry content, video_url and
 * resources, so any signed-in learner could read every academy's whole library.
 */

const MIGRATIONS = "supabase/migrations";
const fix = readFileSync(join(MIGRATIONS, "20260830240000_scope_course_access.sql"), "utf8");

/** Every migration applied after the fix, which could undo it. */
function migrationsAfterTheFix(): { name: string; sql: string }[] {
  return readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith(".sql") && name > "20260830240000")
    .map((name) => ({ name, sql: readFileSync(join(MIGRATIONS, name), "utf8") }));
}

describe("course content is scoped to the people who hold it", () => {
  it("replaces all three open policies", () => {
    for (const table of ["public.courses", "public.sections", "public.chapters"]) {
      expect(fix, table).toContain(`ON ${table}`);
    }
    expect(fix).toContain('DROP POLICY IF EXISTS "Anyone can view published courses"');
    expect(fix).toContain('DROP POLICY IF EXISTS "Users can view sections of accessible courses"');
    expect(fix).toContain('DROP POLICY IF EXISTS "Users can view chapters"');
  });

  it("grants access from an enrolment or a live service, not from publication", () => {
    // Being published says the course is finished, not that you bought it.
    expect(fix).toContain("has_course_access");
    expect(fix).toContain("FROM public.enrollments");
    expect(fix).toContain("FROM public.service_users su");
    expect(fix).toContain("sc.course_id = course");
  });

  it("respects the status and the expiry on an entitlement", () => {
    // A cancelled or lapsed purchase is not access.
    expect(fix).toContain("su.status = 'active'");
    expect(fix).toContain("su.expires_at IS NULL OR su.expires_at > now()");
  });

  it("ties a lesson's visibility to its course rather than to nothing", () => {
    const chapters = fix.slice(fix.indexOf("ON public.chapters"));
    expect(chapters).toContain("FROM public.sections s");
    expect(chapters).toContain("JOIN public.courses c ON c.id = s.course_id");
    expect(chapters).toContain("has_course_access");
  });

  it("indexes what the policy has to check on every row", () => {
    // These run inside a policy, once per row scanned.
    expect(fix).toContain("enrollments_user_course_idx");
    expect(fix).toContain("service_users_user_status_idx");
    expect(fix).toContain("service_courses_course_idx");
  });

  it("is not undone by a later migration", () => {
    for (const { name, sql } of migrationsAfterTheFix()) {
      // A later USING (true) on any of these tables would silently reopen it.
      const reopened = /CREATE POLICY[\s\S]{0,400}?ON public\.(courses|sections|chapters)[\s\S]{0,300}?USING \(\s*true\s*\)/i;
      expect(sql, `${name} reopens course content`).not.toMatch(reopened);
    }
  });
});

describe("the catalogue shows what you hold", () => {
  const page = readFileSync("src/pages/Courses.tsx", "utf8");

  it("asks what the viewer is entitled to before listing anything", () => {
    expect(page).toContain('from("enrollments")');
    expect(page).toContain('from("service_users")');
    expect(page).toContain('from("service_courses")');
  });

  it("only counts a live entitlement", () => {
    expect(page).toContain('.eq("status", "active")');
  });

  it("shows staff their own courses here, not every tenant's", () => {
    // RLS lets platform staff read every course because they administer them.
    // The learning catalogue is not where that should be exercised.
    const loader = page.slice(page.indexOf("const fetchCourses"), page.indexOf("const fetchStudentLevel"));
    expect(loader).toContain("course.coach_id === user.id");
    expect(loader).toContain("entitled.has(course.id)");
    expect(loader).not.toMatch(/isCoachOrAdmin|hasRole\(/);
  });

  it("shows nothing at all when nobody is signed in", () => {
    const loader = page.slice(page.indexOf("const fetchCourses"), page.indexOf("const fetchStudentLevel"));
    expect(loader).toContain("if (!user)");
  });
});
