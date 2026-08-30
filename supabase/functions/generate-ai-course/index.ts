// Turns a topic into a course outline using whichever text provider the coach
// configured in Settings > AI providers.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, requireUser } from "../_shared/edge.ts";
import {
  AiError,
  generateText,
  parseJsonReply,
  resolveModel,
} from "../_shared/aiClient.ts";

interface GeneratedCourse {
  course_title: string;
  description: string;
  learning_outcomes: string[];
  modules: { module_title: string; lessons: { lesson_title: string; description: string }[] }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { userId, error: authError } = await requireUser(req);
  if (authError) return authError;

  try {
    const { action, topic, audience, level, duration, language, instructions } = await req.json();

    if (action !== "generate") return json({ error: "Invalid action" }, 400);
    if (!topic) return json({ error: "A topic is required." }, 400);

    const resolved = await resolveModel(userId, "text");

    const prompt = `Create a professional online course structure. Return ONLY valid JSON with this exact structure:
{
  "course_title": "string",
  "description": "string",
  "learning_outcomes": ["string"],
  "modules": [
    {
      "module_title": "string",
      "lessons": [
        {
          "lesson_title": "string",
          "description": "string"
        }
      ]
    }
  ]
}

Topic: ${topic}
Target Audience: ${audience || "General"}
Skill Level: ${level || "Beginner"}
Course Duration: ${duration || "4 weeks"}
Language: ${language || "English"}
${instructions ? `Additional Instructions: ${instructions}` : ""}`;

    const result = await generateText(resolved, {
      system: "You are an expert course creator. Always return valid JSON only, no markdown.",
      prompt,
      json: true,
    });

    return json({
      course: parseJsonReply<GeneratedCourse>(result.text),
      tokens_used: result.tokensUsed,
      model: resolved.model,
      provider: resolved.credential.provider,
    });
  } catch (e) {
    if (e instanceof AiError) return json({ error: e.message }, e.status);
    console.error("generate-ai-course error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
