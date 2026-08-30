import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { makeEmptyRow } from "./emailTemplateRows";
import { COACH_TEMPLATES, SYSTEM_TEMPLATE } from "./emailTemplates";

describe("makeEmptyRow", () => {
  it("starts a template from its shipped defaults", () => {
    const def = COACH_TEMPLATES[0];
    const row = makeEmptyRow(def, "coach-1");
    expect(row.template_key).toBe(def.key);
    expect(row.subject).toBe(def.defaultSubject);
    expect(row.body_html).toBe(def.defaultBody);
  });

  it("switches a template on until a coach turns it off", () => {
    // Email Automation reads is_active straight from here, so an unsaved
    // template has to read as enabled rather than as off-by-default.
    expect(makeEmptyRow(COACH_TEMPLATES[0], "coach-1").is_active).toBe(true);
  });

  it("keeps the system template ownerless, which is how its row is keyed", () => {
    expect(makeEmptyRow(SYSTEM_TEMPLATE, null).coach_id).toBeNull();
  });
});

describe("the two template screens stay in step", () => {
  // Email Automation used to list 24 invented template names that existed
  // nowhere else, so switching one off did nothing and none of them could be
  // edited. Both screens now read the same definitions and the same table.
  const source = (path: string) => readFileSync(path, "utf8");

  const SCREENS = [
    "src/pages/EmailAutomation.tsx",
    "src/components/settings/EmailTemplatesTab.tsx",
  ];

  it("builds both lists from the shared definitions", () => {
    for (const path of SCREENS) {
      expect(source(path), path).toContain('from "@/lib/emailTemplates"');
      expect(source(path), path).toContain("COACH_TEMPLATES");
    }
  });

  it("reads and writes both through the shared row helpers", () => {
    for (const path of SCREENS) {
      expect(source(path), path).toContain('from "@/lib/emailTemplateRows"');
      expect(source(path), path).toContain("loadTemplateRows");
    }
  });

  it("lets neither screen keep a template list of its own", () => {
    for (const path of SCREENS) {
      // The old bug in one line: a local array of template names.
      expect(source(path), path).not.toMatch(/const\s+templates\s*=\s*\[/);
    }
  });

  it("edits through the same panel on both screens", () => {
    for (const path of SCREENS) {
      expect(source(path), path).toContain("TemplateFields");
    }
  });

  it("edits automation templates in place rather than sending you to Settings", () => {
    // Editing used to hand off to /settings/email?tab=templates, which meant
    // leaving the automation list to change a single line of copy.
    const automation = source("src/pages/EmailAutomation.tsx");
    expect(automation).not.toMatch(/to=\{?["'`][^"'`]*tab=templates/);
  });

  it("covers every automation email the old hardcoded list promised", () => {
    // Kept as an explicit list because these are the emails coaches were told
    // the product sends; losing one to a refactor is a silent regression.
    const required = [
      "service_purchase_confirmed",
      "abandoned_checkout",
      "payment_failed",
      "post_published",
      "post_comment",
      "comment_like",
      "comment_reply",
      "comment_mention",
      "service_announcement",
      "workshop_scheduled",
      "workshop_rescheduled",
      "workshop_cancelled",
      "workshop_reminder",
      "recording_available",
      "subscription_expired",
      "course_progress_milestone",
      "course_completed",
      "consultation_booked",
      "consultation_reminder",
      "consultation_cancelled",
    ];
    const keys = new Set(COACH_TEMPLATES.map((t) => t.key));
    for (const key of required) expect(keys, key).toContain(key);
  });
});
