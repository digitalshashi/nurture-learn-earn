// Generates content ideas, scripts and WhatsApp messages with the coach's
// configured text provider.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, requireUser } from "../_shared/edge.ts";
import { AiError, generateJson, resolveModel } from "../_shared/aiClient.ts";

interface ContentItem {
  title: string;
  hook: string;
  description: string;
  platform_tip?: string;
}

const SHAPE = `{
  "items": [
    {
      "title": "string",
      "hook": "string",
      "description": "string",
      "platform_tip": "string"
    }
  ]
}`;

const TYPE_INSTRUCTIONS: Record<string, string> = {
  ideas: "Generate 15 unique content ideas with hooks and brief descriptions.",
  script: "Generate a full video script with hook, body, and CTA.",
  whatsapp: "Generate 5 WhatsApp marketing messages with emojis.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { userId, error: authError } = await requireUser(req);
  if (authError) return authError;

  try {
    const { niche, audience, platform, goal, language, content_type } = await req.json();

    const resolved = await resolveModel(userId, "text");
    const result = await generateJson<{ items: ContentItem[] }>(resolved, {
      system:
        "You are a creative content strategist. Return structured, actionable content.",
      shape: SHAPE,
      prompt: `You are a content strategist for coaches and creators.

${TYPE_INSTRUCTIONS[content_type] || TYPE_INSTRUCTIONS.ideas}

Details:
- Niche: ${niche || "coaching"}
- Target Audience: ${audience || "entrepreneurs"}
- Platform: ${platform || "Instagram"}
- Goal: ${goal || "engagement"}
- Language: ${language || "English"}`,
    });

    return json({ items: Array.isArray(result.items) ? result.items : [] });
  } catch (e) {
    if (e instanceof AiError) return json({ error: e.message }, e.status);
    console.error("ai-content-generator error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
