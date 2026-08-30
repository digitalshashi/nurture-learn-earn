/**
 * Persisting a course's curriculum — sections and their chapters.
 *
 * Both editors (the builder at /course-builder and the Curriculum tab under
 * /course-manage) used to carry their own near-identical copy of this, and
 * both shared two defects:
 *
 *   - Only the first write was error-checked, so a refused insert still
 *     finished with a "Saved!" toast and nothing on disk.
 *   - Rows removed in the editor were never deleted, so a chapter you dropped
 *     came back on the next load.
 *
 * A third, subtler one is the reason updates here ask for their rows back: a
 * row RLS will not let you touch is *invisible* to UPDATE rather than an
 * error, so `update().eq(id)` reports success having changed nothing. Reading
 * the affected ids back is the only way to tell "saved" from "silently
 * dropped" — which is exactly what an admin editing a course they do not own
 * would otherwise hit.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

type ChapterWrite = Omit<Database["public"]["Tables"]["chapters"]["Insert"], "section_id">;

export interface ChapterDraft {
  /** Absent for a chapter added in the editor and not yet written. */
  id?: string;
  title: string;
  video_url?: string | null;
  video_type?: string | null;
  content?: string | null;
  content_type?: string;
  thumbnail_url?: string | null;
  video_description?: string | null;
  duration_seconds?: number | null;
  resources?: Json | null;
}

export interface SectionDraft {
  id?: string;
  title: string;
  chapters: ChapterDraft[];
}

const PERMISSION_HINT =
  "the row was not saved — it may have been deleted, or you may not have permission to edit this course";

/**
 * Only the keys the editor actually tracks are written. The builder does not
 * know about `content_type`, and sending `undefined` for it would blank a
 * value the Curriculum tab set.
 */
function chapterPayload(chapter: ChapterDraft, order: number): ChapterWrite {
  const payload: ChapterWrite = { title: chapter.title, sort_order: order };
  if (chapter.video_url !== undefined) payload.video_url = chapter.video_url;
  if (chapter.video_type !== undefined) payload.video_type = chapter.video_type;
  if (chapter.content !== undefined) payload.content = chapter.content;
  if (chapter.content_type !== undefined) payload.content_type = chapter.content_type;
  if (chapter.thumbnail_url !== undefined) payload.thumbnail_url = chapter.thumbnail_url;
  if (chapter.video_description !== undefined) payload.video_description = chapter.video_description;
  if (chapter.duration_seconds !== undefined) payload.duration_seconds = chapter.duration_seconds;
  if (chapter.resources !== undefined) payload.resources = chapter.resources;
  return payload;
}

async function upsertSection(courseId: string, section: SectionDraft, order: number): Promise<string> {
  const payload = { title: section.title, sort_order: order };
  const label = section.title?.trim() || "Untitled section";

  if (section.id) {
    const { data, error } = await supabase
      .from("sections")
      .update(payload)
      .eq("id", section.id)
      .select("id");
    if (error) throw new Error(`Section "${label}" could not be saved: ${error.message}`);
    if (!data || data.length === 0) throw new Error(`Section "${label}": ${PERMISSION_HINT}.`);
    return section.id;
  }

  const { data, error } = await supabase
    .from("sections")
    .insert({ course_id: courseId, ...payload })
    .select("id")
    .single();
  if (error) throw new Error(`Section "${label}" could not be created: ${error.message}`);
  if (!data?.id) throw new Error(`Section "${label}": ${PERMISSION_HINT}.`);
  return data.id;
}

async function upsertChapter(sectionId: string, chapter: ChapterDraft, order: number): Promise<string> {
  const payload = chapterPayload(chapter, order);
  const label = chapter.title?.trim() || "Untitled chapter";

  if (chapter.id) {
    const { data, error } = await supabase
      .from("chapters")
      .update(payload)
      .eq("id", chapter.id)
      .select("id");
    if (error) throw new Error(`Chapter "${label}" could not be saved: ${error.message}`);
    if (!data || data.length === 0) throw new Error(`Chapter "${label}": ${PERMISSION_HINT}.`);
    return chapter.id;
  }

  const { data, error } = await supabase
    .from("chapters")
    .insert({ section_id: sectionId, ...payload })
    .select("id")
    .single();
  if (error) throw new Error(`Chapter "${label}" could not be created: ${error.message}`);
  if (!data?.id) throw new Error(`Chapter "${label}": ${PERMISSION_HINT}.`);
  return data.id;
}

/**
 * Writes `sections` as the course's complete curriculum: rows are created,
 * updated and renumbered in the order given, and anything the editor dropped
 * is deleted. Throws on the first write that does not land, with a message
 * naming the row so the editor can show something better than "failed".
 *
 * Returns the drafts with database ids filled in, so the caller can keep
 * editing without a reload.
 */
export async function saveCurriculum(
  courseId: string,
  sections: SectionDraft[],
): Promise<SectionDraft[]> {
  const { data: existing, error: readError } = await supabase
    .from("sections")
    .select("id, chapters(id)")
    .eq("course_id", courseId);
  if (readError) throw new Error(`Could not read the current curriculum: ${readError.message}`);

  const keptSectionIds = new Set<string>();
  const keptChapterIds = new Set<string>();
  const saved: SectionDraft[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const sectionId = await upsertSection(courseId, section, i);
    keptSectionIds.add(sectionId);

    const chapters: ChapterDraft[] = [];
    for (let j = 0; j < section.chapters.length; j++) {
      const chapterId = await upsertChapter(sectionId, section.chapters[j], j);
      keptChapterIds.add(chapterId);
      chapters.push({ ...section.chapters[j], id: chapterId });
    }

    saved.push({ ...section, id: sectionId, chapters });
  }

  // Chapters first: a section still holding rows is the case where a cascade
  // may not be configured, and orphaned chapters would keep showing up.
  const staleChapterIds: string[] = [];
  const staleSectionIds: string[] = [];
  for (const row of existing ?? []) {
    const sectionRow = row as { id: string; chapters?: { id: string }[] | null };
    if (!keptSectionIds.has(sectionRow.id)) staleSectionIds.push(sectionRow.id);
    for (const chapter of sectionRow.chapters ?? []) {
      if (!keptChapterIds.has(chapter.id)) staleChapterIds.push(chapter.id);
    }
  }

  if (staleChapterIds.length > 0) {
    const { error } = await supabase.from("chapters").delete().in("id", staleChapterIds);
    if (error) throw new Error(`Removed chapters could not be deleted: ${error.message}`);
  }
  if (staleSectionIds.length > 0) {
    const { error } = await supabase.from("sections").delete().in("id", staleSectionIds);
    if (error) throw new Error(`Removed sections could not be deleted: ${error.message}`);
  }

  return saved;
}
