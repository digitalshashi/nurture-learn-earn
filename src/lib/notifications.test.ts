import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  AUTO_LINKS,
  AUTO_VARIABLES,
  NOTIFICATIONS,
  NOTIFICATION_EVENTS,
  NOTIFIED_TEMPLATES,
  templatesForEvent,
} from "../../supabase/functions/_shared/notifications";
import { ALL_TEMPLATES } from "./emailTemplates";

describe("every template is reachable", () => {
  it("has an event that sends it", () => {
    // Forty-three templates were designed and five were ever sent. A coach
    // could spend an afternoon editing one that no learner would receive.
    const missing = ALL_TEMPLATES.filter((t) => !NOTIFICATIONS[t.key]).map((t) => t.key);
    expect(missing).toEqual([]);
  });

  it("has no registry entry for a template that does not exist", () => {
    const keys = new Set(ALL_TEMPLATES.map((t) => t.key));
    const orphans = NOTIFIED_TEMPLATES.filter((key) => !keys.has(key));
    expect(orphans).toEqual([]);
  });

  it("asks the caller for every variable the template actually uses", () => {
    // A variable nobody supplies prints as a literal {{token}} in an inbox.
    const auto = new Set<string>([...AUTO_VARIABLES, ...Object.keys(AUTO_LINKS)]);

    for (const template of ALL_TEMPLATES) {
      const spec = NOTIFICATIONS[template.key];
      if (!spec) continue;

      const used = new Set(
        [...template.defaultBody.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)].map((m) => m[1]),
      );
      const supplied = new Set([...spec.required, ...auto]);
      const unsupplied = [...used].filter((name) => !supplied.has(name));

      expect(unsupplied, `${template.key} has no source for: ${unsupplied.join(", ")}`).toEqual([]);
    }
  });

  it("asks for nothing the template does not use", () => {
    // A required variable the body never prints is work for every caller and
    // a lie about what the email needs.
    for (const template of ALL_TEMPLATES) {
      const spec = NOTIFICATIONS[template.key];
      if (!spec) continue;

      const body = template.defaultBody + template.defaultSubject;
      const unused = spec.required.filter((name) => !body.includes(`{{${name}}}`));
      expect(unused, `${template.key} requires unused: ${unused.join(", ")}`).toEqual([]);
    }
  });
});

describe("the registry is coherent", () => {
  it("names an audience and a trigger for every template", () => {
    for (const [key, spec] of Object.entries(NOTIFICATIONS)) {
      expect(["learner", "coach"], key).toContain(spec.audience);
      expect(["server", "app", "scheduled"], key).toContain(spec.trigger);
      expect(spec.about.length, key).toBeGreaterThan(10);
    }
  });

  it("uses a dotted event name so the namespace stays readable", () => {
    for (const [key, spec] of Object.entries(NOTIFICATIONS)) {
      expect(spec.event, key).toMatch(/^[a-z_]+\.[a-z_]+$/);
    }
  });

  it("lets one event send more than one email", () => {
    // A payment tells the buyer and the coach, and they are different emails.
    const onPayment = templatesForEvent("payment.succeeded");
    expect(onPayment).toContain("payment_receipt");
    expect(onPayment).toContain("sale_notification");
    expect(onPayment).toContain("service_purchase_confirmed");
  });

  it("addresses the coach for the things that happened to the coach", () => {
    expect(NOTIFICATIONS.sale_notification.audience).toBe("coach");
    expect(NOTIFICATIONS.assignment_submitted.audience).toBe("coach");
    // And the learner for the things that happened to the learner.
    expect(NOTIFICATIONS.payment_receipt.audience).toBe("learner");
    expect(NOTIFICATIONS.badge_earned.audience).toBe("learner");
  });

  it("schedules the ones that are a date arriving, not an action", () => {
    for (const key of [
      "event_reminder",
      "workshop_reminder",
      "consultation_reminder",
      "course_reminder",
      "course_progress_digest",
      "course_access_expiring",
      "abandoned_checkout",
      "subscription_renewal_reminder",
      "subscription_expired",
    ]) {
      expect(NOTIFICATIONS[key].trigger, key).toBe("scheduled");
    }
  });

  it("keeps sign-in and payment on the server", () => {
    // Never from the browser: the app cannot be trusted to say a payment
    // succeeded, and an OTP sent from the client would be an open relay.
    for (const key of ["login_otp", "payment_receipt", "sale_notification", "account_created"]) {
      expect(NOTIFICATIONS[key].trigger, key).toBe("server");
    }
  });

  it("exposes every event name once", () => {
    expect(new Set(NOTIFICATION_EVENTS).size).toBe(NOTIFICATION_EVENTS.length);
    expect(NOTIFICATION_EVENTS.length).toBeGreaterThan(30);
  });
});

describe("the dispatcher fills what it promises", () => {
  const dispatcher = readFileSync("supabase/functions/notify/index.ts", "utf8");

  it("fills every automatic variable", () => {
    for (const name of AUTO_VARIABLES) {
      expect(dispatcher, name).toContain(name);
    }
  });

  it("builds every link the registry advertises", () => {
    // Built by walking AUTO_LINKS rather than named one by one, so adding a
    // link to the registry is enough to make it available to every template.
    expect(dispatcher).toContain("for (const [name, path] of Object.entries(AUTO_LINKS))");
    expect(Object.keys(AUTO_LINKS).length).toBeGreaterThan(5);
    for (const path of Object.values(AUTO_LINKS)) {
      expect(path, path).toMatch(/^\//);
    }
  });

  it("respects a coach switching an email off", () => {
    expect(dispatcher).toContain("automation_event_toggles");
  });

  it("never lets a caller choose the recipient address", () => {
    // Otherwise the notify endpoint is a way to send templated mail to anyone.
    expect(dispatcher).not.toMatch(/body\.to\b/);
    expect(dispatcher).toContain("resolveRecipient");
  });
});

describe("the scheduled ones have a clock behind them", () => {
  const scheduler = readFileSync("supabase/functions/notify-scheduled/index.ts", "utf8");
  const cron = readFileSync(
    "supabase/migrations/20260830170000_schedule_notifications.sql",
    "utf8",
  );

  const scheduled = Object.entries(NOTIFICATIONS)
    .filter(([, spec]) => spec.trigger === "scheduled")
    .map(([key]) => key);

  it("sends every template it says is scheduled", () => {
    // A template marked "scheduled" that nothing queries for is not scheduled,
    // it is simply never sent — which is what "coming soon" looked like.
    for (const key of scheduled) {
      expect(scheduler, key).toContain(`"${key}"`);
    }
  });

  it("reports what it is not yet driving instead of implying zero", () => {
    expect(scheduler).toContain("not_yet_scheduled");
  });

  it("takes one reading of the clock for the whole run", () => {
    // Two queries disagreeing about "now" would land the same reminder in two
    // different windows, or in neither.
    expect(scheduler).toContain("const now = new Date();");
    expect(scheduler).toMatch(/eventReminders\(now\)/);
    expect(scheduler).toMatch(/workshopReminders\(now\)/);
  });

  it("bounds every reminder window at both ends", () => {
    // A window open at the far end means a missed run wakes up and sends a
    // month of reminders at once. The weekly digest is deliberately excluded:
    // it is a trailing seven days up to now, so it has no far end to close.
    const bounded = [
      "eventReminders",
      "subscriptionNotices",
      "idleCourses",
      "accessExpiring",
      "abandonedCheckouts",
      "workshopReminders",
    ];

    for (const name of bounded) {
      const start = scheduler.indexOf(`async function ${name}`);
      expect(start, name).toBeGreaterThan(-1);

      const body = scheduler.slice(start, scheduler.indexOf("\n}", start));
      expect(body, `${name} has no lower bound`).toContain(".gte(");
      expect(body, `${name} has no upper bound`).toContain(".lt(");
    }
  });

  it("runs hourly, matching the hour-wide reminder windows", () => {
    expect(cron).toContain("'0 * * * *'");
    expect(cron).toContain("cron.schedule");
    expect(cron).toContain("notify-scheduled");
  });

  it("keeps the scheduler's token out of the repository", () => {
    // The database generates it and the function reads it back with the
    // service role, so neither side has it written down.
    expect(cron).toContain("gen_random_bytes");
    expect(cron).toContain("ENABLE ROW LEVEL SECURITY");
    expect(cron).toMatch(/REVOKE ALL ON public\.internal_secrets FROM anon, authenticated/);
    expect(scheduler).toContain('.eq("name", "notify_cron")');
  });

  it("does not send a consultation two different reminders", () => {
    // Both live in the events table, so the generic one has to stand aside.
    expect(scheduler).toContain("consultationServiceIds");
    expect(scheduler).toContain("isConsultation");
  });

  it("only chases a checkout it can address", () => {
    // An anonymous checkout view has no email attached, and guessing one is
    // not an option.
    const abandoned = scheduler.slice(scheduler.indexOf("async function abandonedCheckouts"));
    expect(abandoned).toContain('.not("user_id", "is", null)');
    // And never someone who went on to pay.
    expect(abandoned).toContain("bought.has(key)");
  });
});
