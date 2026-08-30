// Turning a blueprint into a real course.
//
// A blueprint is a plan; courses/sections/chapters is what students actually
// open. This module is the translation between them, and it is a pure function
// so the shape can be asserted in a test rather than discovered by publishing
// and looking.
//
// Ten sections come out: three foundation days, six bonuses, and the live
// classes. That mirrors the price ladder — a coach who sells the foundation
// alone can unpublish the rest without unpicking anything.

import type { CoursePayload } from "./types";

export interface PlannedChapter {
  title: string;
  /** Shown as the lecture description in the player. */
  video_description: string;
  /** Shown as lesson notes. Newlines collapse in the player, so this reads as prose. */
  content: string;
}

export interface PlannedSection {
  title: string;
  chapters: PlannedChapter[];
}

export interface CourseOutline {
  title: string;
  description: string;
  sections: PlannedSection[];
}

/** "Do this: fill the survey • join the community" — readable even unwrapped. */
const actionLine = (actions: string[]) =>
  actions.length ? `Do this: ${actions.join(" • ")}` : "";

const joinParagraphs = (parts: string[]) => parts.filter(Boolean).join("\n\n");

/**
 * The course description a buyer reads.
 *
 * Built from the coach's own pain and result rather than the topic alone,
 * because "Instagram content creation" describes the subject and "from zero
 * followers to your first income online" describes the reason to buy.
 */
function courseDescription(payload: CoursePayload): string {
  const { meta, steps } = payload;
  return joinParagraphs([
    `For ${meta.audience}. From ${meta.starting_pain} to ${meta.desired_result}.`,
    `Six steps: ${steps.map((step) => step.name).join(" → ")}.`,
    `Taught by ${meta.coach_name}.`,
  ]);
}

export function toCourseOutline(payload: CoursePayload): CourseOutline {
  const sections: PlannedSection[] = [];

  for (const day of payload.foundation.days) {
    sections.push({
      title: `Day ${day.day} — ${day.theme}`,
      chapters: day.videos.map((video) => ({
        title: video.title || video.slot_purpose,
        video_description: video.covers,
        // The slot purpose is carried across so the coach can still see what
        // each video is for once they are editing inside the course builder,
        // where the blueprint's locked labels are no longer on screen.
        content: joinParagraphs([`Slot: ${video.slot_purpose}`, actionLine(video.learner_actions)]),
      })),
    });
  }

  for (const bonus of payload.bonuses) {
    sections.push({
      title: `Bonus ${bonus.number} — ${bonus.topic}`,
      chapters: [
        ...bonus.videos.map((video) => ({
          title: video.title || `${bonus.topic} — ${video.slot}`,
          video_description: video.covers,
          content: bonus.purpose,
        })),
        // The download is a chapter of its own so it has somewhere to be
        // attached. A resource mentioned only in a paragraph never gets one.
        {
          title: `Resource — ${bonus.resource.name}`,
          video_description: `The ${bonus.resource.name} for the ${bonus.topic} bonus.`,
          content: `Upload the ${bonus.resource.name} (${bonus.resource.type === "sheet" ? "spreadsheet" : "PDF"}) to this lesson.`,
        },
      ],
    });
  }

  if (payload.live.sessions.length) {
    sections.push({
      title: "Live Classes",
      chapters: payload.live.sessions.map((session) => {
        const step = payload.steps.find((entry) => entry.number === session.step_ref);
        return {
          title: `Day ${session.day} — ${session.title}`,
          video_description: session.taught,
          content: joinParagraphs([
            `Builds: Step ${session.step_ref}${step ? ` — ${step.name}` : ""}`,
            `Outcome: ${session.outcome}`,
          ]),
        };
      }),
    });
  }

  return {
    title: payload.meta.course_name,
    description: courseDescription(payload),
    sections,
  };
}

/** Chapters across the whole outline — what the publish confirmation counts. */
export function countChapters(outline: CourseOutline): number {
  return outline.sections.reduce((total, section) => total + section.chapters.length, 0);
}
