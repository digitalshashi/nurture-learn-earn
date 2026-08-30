// Ad scripts, webinar scoring and client showcases, using the coach's
// configured text provider.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, requireUser } from "../_shared/edge.ts";
import { AiError, generateJson, resolveModel } from "../_shared/aiClient.ts";

const PROMPTS: Record<string, { system: string; instructions: string }> = {
  ads: {
    system: "You are an expert direct-response ad copywriter for coaches and course creators.",
    instructions:
      "Write a short-form video ad script (30-45 seconds) for the offer/brief below. Include a hook, the problem, the offer, and a clear call to action.",
  },
  webinar: {
    system:
      "You are an expert webinar coach who scores transcripts against a proven conversion rubric.",
    instructions:
      "Score this webinar transcript 1-10 on each of: hook, offer clarity, objection handling, urgency, call to action. Give one specific improvement per criterion.",
  },
  showcase: {
    system:
      "You are a brand strategist helping a coach summarize their results into a compelling case study.",
    instructions:
      "Turn the input below into a short client-showcase script: situation, transformation, proof, and a one-line takeaway.",
  },
};

const SHAPE = `{
  "output": "the generated script or written feedback, formatted with line breaks",
  "score": null
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { userId, error: authError } = await requireUser(req);
  if (authError) return authError;

  try {
    const { type, input_text } = await req.json();
    const config = PROMPTS[type];
    if (!config) return json({ error: "Unknown booster type" }, 400);
    if (!input_text || !String(input_text).trim()) {
      return json({ error: "input_text is required" }, 400);
    }

    const resolved = await resolveModel(userId, "text");
    const result = await generateJson<{ output: string; score?: number | null }>(resolved, {
      system: config.system,
      shape: `${SHAPE}\n"score" is an overall 0-100 score for a scoring task, otherwise null.`,
      prompt: `${config.instructions}\n\n---\n${input_text}`,
    });

    return json({ output: result.output || "", score: result.score ?? null });
  } catch (e) {
    if (e instanceof AiError) return json({ error: e.message }, e.status);
    console.error("growth-booster error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
