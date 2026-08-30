/**
 * Reusable copy a coach writes once and sends many times.
 *
 * Distinct from emailTemplates.ts, which is the fixed set of system-triggered
 * emails: these are free-form, span email / WhatsApp / push, and exist only
 * because someone chose to save them.
 *
 * They are managed on /automation/templates and consumed wherever a message is
 * composed, so a template saved in one place can be loaded in the other.
 */

import { supabase } from "@/integrations/supabase/client";

/** The channels a saved template can belong to, as stored. */
export type TemplateChannel = "email" | "whatsapp" | "notification";

export interface AutomationTemplate {
  id: string;
  name: string;
  channel: string;
  category: string;
  subject: string | null;
  content: string | null;
  is_active: boolean;
  created_at: string;
}

/**
 * Broadcasts calls the push channel "push"; the templates table calls it
 * "notification". They are the same thing, and this is the only place that
 * needs to know.
 */
export function channelForBroadcast(broadcastType: string): TemplateChannel {
  if (broadcastType === "push") return "notification";
  return broadcastType === "whatsapp" ? "whatsapp" : "email";
}

export const CHANNEL_LABELS: Record<TemplateChannel, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  notification: "Push notification",
};

/**
 * Saved templates for one channel, newest first.
 *
 * Only active ones: switching a template off on the templates screen should
 * take it out of the pickers without deleting the copy.
 */
export async function loadTemplatesForChannel(
  coachId: string,
  channel: TemplateChannel,
): Promise<AutomationTemplate[]> {
  const { data } = await supabase
    .from("automation_templates")
    .select("id, name, channel, category, subject, content, is_active, created_at")
    .eq("coach_id", coachId)
    .eq("channel", channel)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return (data as AutomationTemplate[] | null) ?? [];
}

/** Saves composed copy as a reusable template. */
export async function createTemplate(
  coachId: string,
  template: {
    name: string;
    channel: TemplateChannel;
    category?: string;
    subject?: string | null;
    content?: string | null;
  },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("automation_templates").insert({
    coach_id: coachId,
    name: template.name,
    channel: template.channel,
    category: template.category ?? "campaign",
    // Only email carries a subject; the others would just store an empty string.
    subject: template.channel === "email" ? (template.subject || null) : null,
    content: template.content || null,
  });
  return { error: error?.message ?? null };
}
