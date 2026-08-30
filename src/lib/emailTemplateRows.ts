/**
 * Reading and writing the saved copy of an email template.
 *
 * emailTemplates.ts defines what templates exist and what they say by default;
 * this is the row in email_templates that holds a coach's edits and whether
 * the template is switched on. Both the Templates screen and Email Automation
 * go through here, so the two lists cannot drift apart.
 */

import { supabase } from "@/integrations/supabase/client";
import { COACH_TEMPLATES, SYSTEM_TEMPLATE, type TemplateDef } from "@/lib/emailTemplates";

export interface TemplateRow {
  id?: string;
  coach_id: string | null;
  template_key: string;
  subject: string;
  from_name: string | null;
  reply_to_name: string | null;
  reply_to_email: string | null;
  body_html: string;
  is_active: boolean;
}

/**
 * The row a template starts from before a coach has saved anything.
 *
 * Not written on load: a template with no row is simply on and unedited, so
 * the table only ever holds what a coach actually changed.
 */
export function makeEmptyRow(def: TemplateDef, coachId: string | null): TemplateRow {
  return {
    coach_id: coachId,
    template_key: def.key,
    subject: def.defaultSubject,
    from_name: null,
    reply_to_name: null,
    reply_to_email: null,
    body_html: def.defaultBody,
    is_active: true,
  };
}

/**
 * Every coach template, keyed by template_key, with saved edits merged in.
 *
 * The definition list is what drives the result — a saved row for a template
 * that no longer exists is ignored rather than shown.
 */
export async function loadTemplateRows(
  coachId: string,
  { includeSystem = false }: { includeSystem?: boolean } = {},
): Promise<Record<string, TemplateRow>> {
  const { data: coachRows } = await supabase
    .from("email_templates")
    .select("*")
    .eq("coach_id", coachId);

  const saved = (coachRows ?? []) as unknown as TemplateRow[];
  const rows: Record<string, TemplateRow> = {};
  for (const def of COACH_TEMPLATES) {
    rows[def.key] = saved.find((r) => r.template_key === def.key) ?? makeEmptyRow(def, coachId);
  }

  if (includeSystem) {
    const { data: systemRow } = await supabase
      .from("email_templates")
      .select("*")
      .is("coach_id", null)
      .eq("template_key", SYSTEM_TEMPLATE.key)
      .maybeSingle();
    rows[SYSTEM_TEMPLATE.key] =
      (systemRow as unknown as TemplateRow | null) ?? makeEmptyRow(SYSTEM_TEMPLATE, null);
  }

  return rows;
}

/**
 * Saves one template.
 *
 * The system template is keyed on template_key alone and a coach's on
 * (coach_id, template_key) — two partial unique indexes — so the conflict
 * target follows whichever kind of row this is.
 */
export async function saveTemplateRow(row: TemplateRow): Promise<{ error: string | null }> {
  const { error } = await supabase.from("email_templates").upsert(
    { ...row, updated_at: new Date().toISOString() } as never,
    { onConflict: row.coach_id ? "coach_id,template_key" : "template_key" },
  );
  return { error: error?.message ?? null };
}
