// Drafts a CRM follow-up email with the coach's configured text provider.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, requireUser } from "../_shared/edge.ts";
import { AiError, generateJson, resolveModel } from "../_shared/aiClient.ts";

interface Email {
  subject: string;
  body: string;
  cta_text: string;
}

const SHAPE = `{
  "subject": "email subject line",
  "body": "full email body with greeting and CTA",
  "cta_text": "call to action button text"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { userId, error: authError } = await requireUser(req);
  if (authError) return authError;

  try {
    const { course_name, audience, offer, goal, tone, lead_name } = await req.json();

    const resolved = await resolveModel(userId, "text");
    const result = await generateJson<Email>(resolved, {
      system:
        "You are an expert email copywriter for coaches and course creators. Write persuasive, warm emails.",
      shape: SHAPE,
      prompt: `Generate a follow-up email for a CRM lead.

Details:
- Lead name: ${lead_name || "there"}
- Course/Service: ${course_name || "our program"}
- Target audience: ${audience || "professionals"}
- Offer: ${offer || "enrollment"}
- Goal: ${goal || "conversion"}
- Tone: ${tone || "friendly"}

Generate a compelling email with subject line, body with personalization, and a clear CTA.`,
    });

    return json({
      subject: result.subject || "",
      body: result.body || "",
      cta_text: result.cta_text || "Learn More",
    });
  } catch (e) {
    if (e instanceof AiError) return json({ error: e.message }, e.status);
    console.error("ai-email-writer error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
