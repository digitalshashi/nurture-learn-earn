import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { channelForBroadcast, CHANNEL_LABELS } from "./automationTemplates";

describe("channelForBroadcast", () => {
  it("maps each broadcast type to the channel templates are stored under", () => {
    expect(channelForBroadcast("email")).toBe("email");
    expect(channelForBroadcast("whatsapp")).toBe("whatsapp");
  });

  it("translates push to notification, the two names for one channel", () => {
    // Broadcasts calls it "push", automation_templates calls it
    // "notification". Get this wrong and the picker silently shows nothing.
    expect(channelForBroadcast("push")).toBe("notification");
  });

  it("falls back to email rather than a channel that stores nothing", () => {
    expect(channelForBroadcast("")).toBe("email");
    expect(channelForBroadcast("something-new")).toBe("email");
  });

  it("labels every channel it can return", () => {
    for (const type of ["email", "whatsapp", "push"]) {
      expect(CHANNEL_LABELS[channelForBroadcast(type)]).toBeTruthy();
    }
  });
});

describe("saved templates reach the screens that send", () => {
  // /automation/templates was a full CRUD screen over a table nothing read:
  // you could write a template and had no way to ever send it.
  const source = (path: string) => readFileSync(path, "utf8");

  const COMPOSERS = ["src/pages/Broadcasts.tsx", "src/pages/WhatsAppAutomation.tsx"];

  it("offers saved templates wherever a message is composed", () => {
    for (const path of COMPOSERS) {
      expect(source(path), path).toContain("TemplatePicker");
    }
  });

  it("reads the library the templates screen writes to", () => {
    const picker = source("src/components/automation/TemplatePicker.tsx");
    const screen = source("src/pages/AutomationTemplates.tsx");
    expect(picker).toContain("loadTemplatesForChannel");
    expect(source("src/lib/automationTemplates.ts")).toContain('"automation_templates"');
    expect(screen).toContain('"automation_templates"');
  });

  it("picks the channel from the broadcast being composed", () => {
    // A hardcoded channel here would offer WhatsApp copy on an email.
    expect(source("src/pages/Broadcasts.tsx")).toContain(
      "channelForBroadcast(form.broadcast_type)",
    );
  });
});
