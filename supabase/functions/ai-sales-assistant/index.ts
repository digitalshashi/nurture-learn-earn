// Sales intelligence for one CRM lead, using the coach's configured text
// provider.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, requireUser } from "../_shared/edge.ts";
import { AiError, generateJson, resolveModel } from "../_shared/aiClient.ts";

interface SalesAnalysis {
  purchase_probability: number;
  recommended_action: string;
  best_contact_time: string;
  follow_up_message: string;
  insights: string[];
}

const SHAPE = `{
  "purchase_probability": 0,
  "recommended_action": "best next action to take",
  "best_contact_time": "suggested best time to reach out",
  "follow_up_message": "suggested follow-up message",
  "insights": ["3-5 key insights about this lead"]
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { userId, error: authError } = await requireUser(req);
  if (authError) return authError;

  try {
    const { lead, notes, follow_ups } = await req.json();
    if (!lead) return json({ error: "Lead data required" }, 400);

    const resolved = await resolveModel(userId, "text");
    const result = await generateJson<SalesAnalysis>(resolved, {
      system:
        "You are an expert sales coach AI. Provide actionable, specific sales recommendations.",
      shape: SHAPE,
      prompt: `Analyze this CRM lead and provide sales intelligence.

Lead:
- Name: ${lead.name}
- Email: ${lead.email || "N/A"}
- Phone: ${lead.phone || "N/A"}
- Source: ${lead.source || "unknown"}
- Status: ${lead.status}
- Pipeline Value: ₹${lead.pipeline_value || 0}
- Tags: ${(lead.tags || []).join(", ") || "none"}
- Created: ${lead.created_at}
- Lead Score: ${lead.lead_score || "not scored"}

Notes (${(notes || []).length}):
${(notes || []).slice(0, 5).map((n: { content: string }) => `- ${n.content}`).join("\n") || "No notes"}

Follow-ups (${(follow_ups || []).length}):
${
        (follow_ups || [])
          .slice(0, 5)
          .map(
            (f: { task: string; status: string; due_date: string }) =>
              `- ${f.task} (${f.status}, due: ${f.due_date})`,
          )
          .join("\n") || "No follow-ups"
      }

Provide actionable sales insights.`,
    });

    return json({
      purchase_probability: Number(result.purchase_probability) || 0,
      recommended_action: result.recommended_action || "Follow up",
      best_contact_time: result.best_contact_time || "Morning",
      follow_up_message: result.follow_up_message || "",
      insights: Array.isArray(result.insights) ? result.insights : [],
    });
  } catch (e) {
    if (e instanceof AiError) return json({ error: e.message }, e.status);
    console.error("ai-sales-assistant error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
