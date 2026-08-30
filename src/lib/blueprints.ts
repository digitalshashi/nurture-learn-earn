// Reading, writing and publishing course blueprints.
//
// Kept apart from src/lib/courseEngine/, which is pure and knows nothing about
// Supabase. Everything here is the part that touches a table, so the engine
// stays testable without a database and this stays the only place that has to
// change if storage ever moves.

import { supabase } from "@/integrations/supabase/client";
import { edgeErrorMessage } from "@/lib/errorMessage";
import type { Database } from "@/integrations/supabase/types";
import {
  toCourseOutline,
  type BlueprintMode,
  type BlueprintStatus,
  type CourseInput,
  type CoursePayload,
  type GeneratedBonuses,
  type GeneratedFoundation,
  type GeneratedLive,
} from "@/lib/courseEngine";

export type BlueprintRow = Database["public"]["Tables"]["course_blueprints"]["Row"];
export type BlueprintVersionRow = Database["public"]["Tables"]["course_blueprint_versions"]["Row"];

/** The row with its payload parsed back into the shape the engine works in. */
export interface Blueprint extends Omit<BlueprintRow, "payload"> {
  payload: CoursePayload | null;
}

const parse = (row: BlueprintRow): Blueprint => ({
  ...row,
  payload: (row.payload as unknown as CoursePayload) ?? null,
});

export async function listBlueprints(coachId: string): Promise<Blueprint[]> {
  const { data, error } = await supabase
    .from("course_blueprints")
    .select("*")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(parse);
}

export async function getBlueprint(id: string): Promise<Blueprint | null> {
  const { data, error } = await supabase
    .from("course_blueprints")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? parse(data) : null;
}

export async function createBlueprint(args: {
  coachId: string;
  input: CourseInput;
  mode: BlueprintMode;
  payload: CoursePayload;
  status: BlueprintStatus;
}): Promise<Blueprint> {
  const { data, error } = await supabase
    .from("course_blueprints")
    .insert({
      coach_id: args.coachId,
      name: args.payload.meta.course_name,
      mode: args.mode,
      topic: args.input.topic,
      audience: args.input.audience,
      starting_pain: args.input.starting_pain,
      desired_result: args.input.desired_result,
      coach_name: args.input.coach_name,
      language: args.input.language ?? "en",
      status: args.status,
      payload: args.payload as unknown as Database["public"]["Tables"]["course_blueprints"]["Insert"]["payload"],
    })
    .select("*")
    .single();

  if (error) throw error;
  return parse(data);
}

/**
 * Saves the payload, snapshotting the version it replaces first.
 *
 * `note` is what the coach will read in the version list, so it says what the
 * write was — "generated with AI", "filled from the formula" — rather than a
 * timestamp they cannot act on. Autosaved edits pass no note and take no
 * snapshot: one per keystroke-debounce would bury the meaningful ones.
 */
export async function saveBlueprint(
  blueprint: Blueprint,
  payload: CoursePayload,
  options: { status?: BlueprintStatus; note?: string } = {},
): Promise<Blueprint> {
  if (options.note && blueprint.payload) {
    await snapshot(blueprint.id, blueprint.version, blueprint.payload, options.note);
  }

  const version = options.note ? blueprint.version + 1 : blueprint.version;
  const next: CoursePayload = { ...payload, meta: { ...payload.meta, version } };

  const { data, error } = await supabase
    .from("course_blueprints")
    .update({
      name: next.meta.course_name,
      mode: next.meta.mode,
      language: next.meta.language,
      status: options.status ?? blueprint.status,
      version,
      payload: next as unknown as Database["public"]["Tables"]["course_blueprints"]["Update"]["payload"],
    })
    .eq("id", blueprint.id)
    .select("*")
    .single();

  if (error) throw error;
  return parse(data);
}

async function snapshot(
  blueprintId: string,
  version: number,
  payload: CoursePayload,
  note: string,
): Promise<void> {
  const { error } = await supabase.from("course_blueprint_versions").insert({
    blueprint_id: blueprintId,
    version,
    payload: payload as unknown as Database["public"]["Tables"]["course_blueprint_versions"]["Insert"]["payload"],
    note,
  });

  // A duplicate version means this exact snapshot already exists, which is
  // not a reason to stop the coach's save from going through.
  if (error && error.code !== "23505") throw error;
}

export async function listVersions(blueprintId: string): Promise<BlueprintVersionRow[]> {
  const { data, error } = await supabase
    .from("course_blueprint_versions")
    .select("*")
    .eq("blueprint_id", blueprintId)
    .order("version", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function deleteBlueprint(id: string): Promise<void> {
  const { error } = await supabase.from("course_blueprints").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Turns the blueprint into a real course, unpublished, for the coach to fill
 * with video.
 *
 * Three round trips rather than one per row: fifty-odd sequential inserts is
 * long enough that a coach starts wondering whether it worked. Sections are
 * matched back by sort_order because the API does not promise to return
 * inserted rows in the order they were sent.
 */
export async function publishBlueprint(
  blueprint: Blueprint,
  payload: CoursePayload,
  coachId: string,
): Promise<{ courseId: string; chapters: number }> {
  const outline = toCourseOutline(payload);

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .insert({
      coach_id: coachId,
      title: outline.title,
      description: outline.description,
      is_published: false,
      price: 0,
    })
    .select("id")
    .single();

  if (courseError) throw courseError;

  const { data: sections, error: sectionError } = await supabase
    .from("sections")
    .insert(
      outline.sections.map((section, index) => ({
        course_id: course.id,
        title: section.title,
        sort_order: index,
      })),
    )
    .select("id, sort_order");

  if (sectionError) throw sectionError;

  const byOrder = new Map((sections ?? []).map((section) => [section.sort_order, section.id]));
  const chapters = outline.sections.flatMap((section, sectionIndex) =>
    section.chapters.map((chapter, chapterIndex) => ({
      section_id: byOrder.get(sectionIndex)!,
      title: chapter.title,
      content: chapter.content,
      video_description: chapter.video_description,
      content_type: "text",
      sort_order: chapterIndex,
    })),
  );

  const { error: chapterError } = await supabase.from("chapters").insert(chapters);
  if (chapterError) throw chapterError;

  const { error: linkError } = await supabase
    .from("course_blueprints")
    .update({ published_course_id: course.id, status: "complete" })
    .eq("id", blueprint.id);

  if (linkError) throw linkError;

  return { courseId: course.id, chapters: chapters.length };
}

// ------------------------------------------------------------- the model ---

/** Stage 1, on the server. Throws with a message the coach can act on. */
export async function deriveStepsWithAi(input: CourseInput) {
  const { data, error } = await supabase.functions.invoke("course-engine", {
    body: { action: "derive_steps", input },
  });
  // A non-2xx from the function arrives as "Edge Function returned a non-2xx
  // status code", with the reason we chose to send back sitting in the body.
  if (error) throw new Error(await edgeErrorMessage(error, "The course engine did not respond."));
  if (data?.error) throw new Error(data.error);
  return data as { steps: { number: number; name: string; achievement: string }[]; tokens_used: number };
}

/** Which parts a generation run covers. Omit for all of them. */
export type GenerationSection = "day1" | "day2" | "day3" | "bonuses" | "live";

/**
 * Stage 3. Returns loose parts; the caller stamps them onto the skeleton.
 *
 * `sections` narrows the run, so regenerating the bonuses is one model call
 * rather than five and cannot touch a foundation the coach has edited.
 */
export async function generatePartsWithAi(
  input: CourseInput,
  steps: { number: number; name: string; achievement: string }[],
  sections?: GenerationSection[],
) {
  const { data, error } = await supabase.functions.invoke("course-engine", {
    body: { action: "generate_parts", input, steps, ...(sections?.length ? { sections } : {}) },
  });
  // A non-2xx from the function arrives as "Edge Function returned a non-2xx
  // status code", with the reason we chose to send back sitting in the body.
  if (error) throw new Error(await edgeErrorMessage(error, "The course engine did not respond."));
  if (data?.error) throw new Error(data.error);
  return data as {
    sections: GenerationSection[];
    foundation: GeneratedFoundation;
    bonuses: GeneratedBonuses["bonuses"];
    live: GeneratedLive;
    warnings: string[];
    tokens_used: number;
  };
}

/** One slot, for a coach who is stuck on it and wants another angle. */
export async function suggestSlotWithAi(
  input: CourseInput,
  steps: { number: number; name: string; achievement: string }[],
  target: Record<string, unknown>,
  existing?: { title?: string; covers?: string },
) {
  const { data, error } = await supabase.functions.invoke("course-engine", {
    body: { action: "suggest_slot", input, steps, target, existing },
  });
  // A non-2xx from the function arrives as "Edge Function returned a non-2xx
  // status code", with the reason we chose to send back sitting in the body.
  if (error) throw new Error(await edgeErrorMessage(error, "The course engine did not respond."));
  if (data?.error) throw new Error(data.error);
  return data as {
    suggestion: { title: string; covers: string; learner_actions: string[] };
    tokens_used: number;
  };
}
