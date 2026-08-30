// Writes a workshop landing page with the coach's configured text provider.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, requireUser } from "../_shared/edge.ts";
import { AiError, generateJson, resolveModel } from "../_shared/aiClient.ts";

const SHAPE = `{
  "title": "compelling workshop title",
  "subtitle": "one line subtitle",
  "headline": "hero headline text",
  "mentorBio": "short 2-sentence mentor bio",
  "problems": ["problem 1", "problem 2", "problem 3", "problem 4", "problem 5"],
  "benefits": ["benefit 1", "benefit 2", "benefit 3", "benefit 4", "benefit 5"],
  "modules": [
    {"title": "Module title", "description": "brief description"}
  ],
  "defaultBonuses": [
    {"title": "bonus name", "description": "brief description", "value": "₹999"}
  ],
  "faqs": [
    {"question": "FAQ question", "answer": "FAQ answer"}
  ],
  "certificateText": "text about the certificate",
  "ctaText": "CTA button text",
  "urgencyText": "scarcity/urgency line"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { userId, error: authError } = await requireUser(req);
  if (authError) return authError;

  try {
    const { coachName, skill, targetAudience, coreOutcome, workshopDate, workshopTime } =
      await req.json();

    // This page reads better with more variation than the coach-wide default.
    const resolved = await resolveModel(userId, "text", { temperature: 0.8 });
    const content = await generateJson<Record<string, unknown>>(resolved, {
      system:
        "You are an expert marketing copywriter for online workshops and courses. Generate compelling landing page content.",
      shape: `${SHAPE}\nGive exactly 5 modules, 6 defaultBonuses and 5 faqs.`,
      prompt: `Generate a complete workshop landing page for:
Coach: ${coachName}
Skill/Niche: ${skill}
Target Audience: ${targetAudience}
Core Outcome: ${coreOutcome}
Workshop Date: ${workshopDate || "TBD"}
Workshop Time: ${workshopTime || "TBD"}`,
    });

    return json({ success: true, content });
  } catch (e) {
    if (e instanceof AiError) return json({ error: e.message }, e.status);
    console.error("generate-landing-page error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
