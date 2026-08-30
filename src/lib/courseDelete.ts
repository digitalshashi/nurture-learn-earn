/**
 * Deleting a course.
 *
 * There was no way to do this anywhere in the app — no button, no call, no
 * helper. The database has been ready the whole time: `courses` carries a
 * DELETE policy for the owning coach and for admin/super_admin, and every
 * table that points at a course does so with ON DELETE CASCADE (sections,
 * chapters, enrollments, reviews, channels, events, affiliate rows,
 * chatbot questions, service links) or ON DELETE SET NULL (workshops,
 * certificate templates, blueprints). So one delete is enough, and nothing is
 * left dangling.
 *
 * The one trap worth naming: PostgREST answers a DELETE that row-level
 * security filtered down to nothing with `200 OK`, no error and no rows. A
 * caller that only checks `error` reports success and the course is still
 * there — which is exactly what "unable to delete" looks like from the
 * outside. Every delete here asks for the deleted row back and treats an empty
 * result as the failure it is.
 */
import { supabase } from "@/integrations/supabase/client";

export interface CourseImpact {
  /** Enrolled students who lose access the moment this is gone. */
  students: number;
  sections: number;
  chapters: number;
}

const EMPTY: CourseImpact = { students: 0, sections: 0, chapters: 0 };

/**
 * What deleting this course would take with it, so the confirmation can state
 * it rather than saying "this cannot be undone" and leaving the rest to
 * imagination.
 *
 * Never rejects: a count that cannot be read is not a reason to block the
 * delete, it just means the dialog is less specific.
 */
export async function readCourseImpact(courseId: string): Promise<CourseImpact> {
  try {
    const [students, sections] = await Promise.all([
      supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("course_id", courseId),
      supabase.from("sections").select("id").eq("course_id", courseId),
    ]);

    const sectionIds = (sections.data ?? []).map((row) => row.id);
    // Chapters hang off sections, not off the course, so they need the ids.
    const chapters = sectionIds.length
      ? await supabase
          .from("chapters")
          .select("id", { count: "exact", head: true })
          .in("section_id", sectionIds)
      : { count: 0 };

    return {
      students: students.count ?? 0,
      sections: sectionIds.length,
      chapters: chapters.count ?? 0,
    };
  } catch {
    return EMPTY;
  }
}

/**
 * A course with students on it is somebody else's access, not just the
 * coach's content, so removing it asks for the title to be typed out. An empty
 * draft does not — a guard everybody types past on autopilot protects nothing.
 */
export function requiresTypedConfirmation(impact: CourseImpact): boolean {
  return impact.students > 0;
}

/** The consequences worth spelling out, in the order they matter. */
export function courseDeleteWarnings(
  impact: CourseImpact,
  isPublished: boolean,
): string[] {
  const warnings: string[] = [];

  if (impact.students > 0) {
    warnings.push(
      `${impact.students} enrolled student${impact.students === 1 ? "" : "s"} will lose access immediately, including anyone who paid for it.`,
    );
  }
  if (impact.sections > 0 || impact.chapters > 0) {
    warnings.push(
      `${impact.sections} section${impact.sections === 1 ? "" : "s"} and ${impact.chapters} lesson${impact.chapters === 1 ? "" : "s"} will be deleted.`,
    );
  }
  warnings.push(
    "Reviews, Q&A, comments, assignments and progress records for this course go with it.",
  );
  if (isPublished) {
    warnings.push("Its landing page and any checkout links pointing at it will stop working.");
  }
  // Worth saying out loud: it is the reassuring half, and it is the half
  // people assume wrongly in both directions.
  warnings.push(
    "Videos, images and files stay in your video library — they are only unlinked from this course.",
  );

  return warnings;
}

/** Whether what was typed matches the title closely enough to proceed. */
export function confirmationMatches(typed: string, title: string): boolean {
  return typed.trim().toLowerCase() === title.trim().toLowerCase();
}

/**
 * Delete the course, or throw with a reason a coach can act on.
 *
 * `.select("id")` is what makes this reliable rather than optimistic — see the
 * module comment.
 */
export async function deleteCourse(courseId: string): Promise<void> {
  const { data, error } = await supabase
    .from("courses")
    .delete()
    .eq("id", courseId)
    .select("id");

  if (error) {
    // 23503 is a foreign key still pointing here. Every known reference
    // cascades, so this means a table was added later without one.
    if (error.code === "23503") {
      throw new Error(
        "Something else in the account still links to this course, so the database refused to remove it. Unpublish it instead, and report this — it is a missing cascade rule, not something you did.",
      );
    }
    throw new Error(error.message || "The course could not be deleted.");
  }

  if (!data || data.length === 0) {
    throw new Error(
      "This course was not deleted. Either it has already been removed, or it belongs to another coach's account and you do not have permission to delete it.",
    );
  }
}
