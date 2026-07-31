import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { coachName, skill, targetAudience, coreOutcome, workshopDate, workshopTime } = await req.json();

    const systemPrompt = `You are an expert marketing copywriter for online workshops and courses. Generate compelling landing page content. Return ONLY valid JSON with no markdown formatting.`;

    const userPrompt = `Generate a complete workshop landing page for:
Coach: ${coachName}
Skill/Niche: ${skill}
Target Audience: ${targetAudience}
Core Outcome: ${coreOutcome}
Workshop Date: ${workshopDate || "TBD"}
Workshop Time: ${workshopTime || "TBD"}

Return a JSON object with these exact keys:
{
  "title": "compelling workshop title",
  "subtitle": "one line subtitle",
  "headline": "hero headline text",
  "mentorBio": "short 2-sentence mentor bio",
  "problems": ["problem 1", "problem 2", "problem 3", "problem 4", "problem 5"],
  "benefits": ["benefit 1", "benefit 2", "benefit 3", "benefit 4", "benefit 5"],
  "modules": [
    {"title": "Module 1 title", "description": "brief description"},
    {"title": "Module 2 title", "description": "brief description"},
    {"title": "Module 3 title", "description": "brief description"},
    {"title": "Module 4 title", "description": "brief description"},
    {"title": "Module 5 title", "description": "brief description"}
  ],
  "defaultBonuses": [
    {"title": "bonus name", "description": "brief description", "value": "₹999"},
    {"title": "bonus name", "description": "brief description", "value": "₹999"},
    {"title": "bonus name", "description": "brief description", "value": "₹999"},
    {"title": "bonus name", "description": "brief description", "value": "₹999"},
    {"title": "bonus name", "description": "brief description", "value": "₹999"},
    {"title": "bonus name", "description": "brief description", "value": "₹999"}
  ],
  "faqs": [
    {"question": "FAQ question", "answer": "FAQ answer"},
    {"question": "FAQ question", "answer": "FAQ answer"},
    {"question": "FAQ question", "answer": "FAQ answer"},
    {"question": "FAQ question", "answer": "FAQ answer"},
    {"question": "FAQ question", "answer": "FAQ answer"}
  ],
  "certificateText": "text about the certificate",
  "ctaText": "CTA button text",
  "urgencyText": "scarcity/urgency line"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";
    
    // Strip markdown code fences if present
    let jsonStr = rawContent.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const generated = JSON.parse(jsonStr);

    return new Response(JSON.stringify({ success: true, content: generated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-landing-page error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
