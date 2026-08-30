// The blueprint as a document.
//
// A pure function of the payload, with no model call anywhere in it, which is
// the whole point: a coach can re-export as many times as they like, and an
// export never costs anything or comes back subtly different from the last one.
//
// The layout deliberately mirrors the printed Freedom Business template, so a
// coach who already works from that document recognises what comes out.

import { stepLabel } from "./suggest";
import { stepCoverage } from "./validate";
import type { CoursePayload } from "./types";

const MODE_LABEL: Record<string, string> = {
  formula: "Formula",
  manual: "Written by the coach",
  ai: "AI-generated",
};

/** Pipe characters would split a cell, so they are escaped rather than dropped. */
const cell = (text: string) => (text || "—").replace(/\|/g, "\\|").replace(/\n+/g, " ").trim();

const bullets = (items: string[]) => (items.length ? items.join("; ") : "—");

export function renderMarkdown(payload: CoursePayload): string {
  const { meta, positioning, steps, foundation, bonuses, live, value_stack } = payload;
  const out: string[] = [];

  out.push(`# ${meta.course_name}`);
  out.push("");
  out.push("**Built on the Freedom Business Model**");
  out.push("");
  out.push("| Field | Value |");
  out.push("|---|---|");
  out.push(`| Course topic | ${cell(meta.topic)} |`);
  out.push(`| Niche / audience | ${cell(meta.audience)} |`);
  out.push(`| Starting pain | ${cell(meta.starting_pain)} |`);
  out.push(`| Desired result | ${cell(meta.desired_result)} |`);
  out.push(`| Coach | ${cell(meta.coach_name)} |`);
  out.push(`| Built by | ${MODE_LABEL[meta.mode] ?? meta.mode} |`);
  out.push("");

  if (positioning.pain_statement || positioning.mission_statement || positioning.army_statement) {
    out.push("## Positioning");
    out.push("");
    if (positioning.pain_statement) out.push(`- **Pain:** ${positioning.pain_statement}`);
    if (positioning.mission_statement) out.push(`- **Mission:** ${positioning.mission_statement}`);
    if (positioning.army_statement) out.push(`- **Army:** ${positioning.army_statement}`);
    out.push("");
  }

  out.push("---");
  out.push("");
  out.push("## The 6 Transformation Steps");
  out.push("");
  out.push("| Step | Name | What the student achieves |");
  out.push("|---|---|---|");
  for (const step of steps) {
    out.push(`| ${step.number} | ${cell(step.name)} | ${cell(step.achievement)} |`);
  }
  out.push("");
  out.push("---");
  out.push("");

  // ------------------------------------------------------- part 1: days ---
  out.push("# Part 1 — The 3-Day Foundation Course (Recorded)");
  out.push("");
  out.push("15 videos. 5 per day. The slots are fixed; only what goes inside them changes.");
  out.push("");

  for (const day of foundation.days) {
    out.push(`## Day ${day.day} — ${day.theme}`);
    out.push("");
    out.push(`*${day.goal}*`);
    out.push("");
    out.push("| Video | Slot | What It Covers | Learner Actions |");
    out.push("|---|---|---|---|");
    for (const video of day.videos) {
      out.push(
        `| ${video.slot}. ${cell(video.title)} | ${cell(video.slot_purpose)} | ${cell(video.covers)} | ${cell(bullets(video.learner_actions))} |`,
      );
    }
    out.push("");
  }

  out.push("---");
  out.push("");

  // ---------------------------------------------------- part 2: bonuses ---
  out.push("# Part 2 — The 6 Bonus Courses (Recorded)");
  out.push("");
  out.push("Three videos and one downloadable resource each. The shape never changes.");
  out.push("");

  for (const bonus of bonuses) {
    out.push(`### Bonus ${bonus.number} — ${bonus.topic}`);
    out.push("");
    if (bonus.purpose) out.push(bonus.purpose);
    out.push("");
    for (const video of bonus.videos) {
      const label = video.slot === "context" ? "V1 Context" : video.slot === "content" ? "V2 Content" : "V3 Next Steps";
      out.push(`- **${label} — ${video.title || "—"}:** ${video.covers || "—"}`);
    }
    out.push(`- 📄 Resource: ${bonus.resource.name} (${bonus.resource.type === "sheet" ? "Spreadsheet" : "PDF"})`);
    out.push("");
  }

  out.push("---");
  out.push("");

  // ------------------------------------------------------- part 3: live ---
  out.push("# Part 3 — The Live Classes (Implementation)");
  out.push("");
  out.push(
    live.source === "coach"
      ? "The coach's own day-by-day plan, with each day tagged to the step it builds."
      : "One to three sessions per transformation step. Each session produces one finished outcome.",
  );
  out.push("");
  out.push("| Day | Step It Builds | Class Title | What's Taught | Outcome |");
  out.push("|---|---|---|---|---|");
  for (const session of live.sessions) {
    const step = steps.find((entry) => entry.number === session.step_ref);
    out.push(
      `| ${session.day} | ${step ? cell(stepLabel(step)) : `Step ${session.step_ref}`} | ${cell(session.title)} | ${cell(session.taught)} | ${cell(session.outcome)} |`,
    );
  }
  out.push("");

  // A step with no session is the defect that surfaces mid-programme, so the
  // exported document says it out loud rather than leaving it to be noticed.
  const uncovered = [...stepCoverage(payload).entries()].filter(([, count]) => count === 0);
  if (uncovered.length) {
    out.push(
      `> ⚠️ No live session is attached to: ${uncovered
        .map(([number]) => steps.find((step) => step.number === number)?.name ?? `Step ${number}`)
        .join(", ")}.`,
    );
    out.push("");
  }

  // ------------------------------------------------------- value stack ----
  if (value_stack.length) {
    out.push("---");
    out.push("");
    out.push("## Value Stack");
    out.push("");
    out.push("| Item | What it is | Stated value |");
    out.push("|---|---|---|");
    for (const item of value_stack) {
      out.push(`| ${cell(item.item)} | ${cell(item.description)} | ${item.stated_value ?? "—"} |`);
    }
    out.push("");
  }

  out.push("---");
  out.push("");
  out.push("**Foundation builds belief → Bonuses give tools → Live classes deliver results.**");
  out.push("");

  return out.join("\n");
}

/** A filename a coach will recognise in their downloads folder. */
export function markdownFilename(payload: CoursePayload): string {
  const slug = payload.meta.course_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${slug || "course-blueprint"}.md`;
}
