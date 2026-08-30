// Scores a CRM lead with the coach's configured text provider.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, requireUser } from "../_shared/edge.ts";
import { AiError, generateJson, resolveModel } from "../_shared/aiClient.ts";

const SHAPE = `{
  "score": 0,
  "reasoning": "one sentence explanation"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { userId, error: authError } = await requireUser(req);
  if (authError) return authError;

  try {
    const { lead } = await req.json();
    if (!lead) return json({ error: "Lead data required" }, 400);

    const resolved = await resolveModel(userId, "text");
    const result = await generateJson<{ score: number; reasoning: string }>(resolved, {
      system: "You are a lead scoring AI.",
      shape: SHAPE,
      prompt: `Analyze the following CRM lead and score it from 0 to 100.

Lead data:
- Name: ${lead.name}
- Email: ${lead.email || "not provided"}
- Phone: ${lead.phone || "not provided"}
- Source: ${lead.source || "unknown"}
- Status: ${lead.status}
- City: ${lead.city || "unknown"}
- Tags: ${(lead.tags || []).join(", ") || "none"}
- Pipeline Value: ${lead.pipeline_value || 0}
- Notes count: ${lead.notes_count || 0}
- Follow-ups count: ${lead.follow_ups_count || 0}
- Created: ${lead.created_at}

Scoring criteria:
- Has email AND phone: +15 points
- Has email only: +8 points
- Source is "referral" or "webinar": +15 points
- Source is "meta" or "facebook": +10 points
- Source is "organic" or "website": +8 points
- Has tags: +5 per tag (max 15)
- Pipeline value > 0: +10 points
- Has notes: +5 per note (max 15)
- Has follow-ups: +5 per follow-up (max 10)
- Status is "open": base score
- Status is "converted": 90+`,
    });

    const score = Math.min(100, Math.max(0, Math.round(Number(result.score) || 0)));
    const label = score >= 80 ? "hot" : score >= 40 ? "warm" : "cold";

    return json({ score, label, reasoning: result.reasoning || "" });
  } catch (e) {
    if (e instanceof AiError) return json({ error: e.message }, e.status);
    console.error("ai-lead-score error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
