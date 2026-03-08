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

    const { lead } = await req.json();
    if (!lead) throw new Error("Lead data required");

    const prompt = `You are an AI lead scoring assistant. Analyze the following CRM lead and return a JSON object with "score" (0-100) and "reasoning" (one sentence).

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
- Status is "converted": 90+

Return ONLY valid JSON: {"score": number, "reasoning": "string"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You are a lead scoring AI. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "score_lead",
            description: "Return the lead score and reasoning",
            parameters: {
              type: "object",
              properties: {
                score: { type: "number", description: "Lead score 0-100" },
                reasoning: { type: "string", description: "One sentence explanation" },
              },
              required: ["score", "reasoning"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "score_lead" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Payment required, please add credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let result = { score: 50, reasoning: "Default score" };

    if (toolCall?.function?.arguments) {
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("Failed to parse tool call arguments");
      }
    }

    const score = Math.min(100, Math.max(0, Math.round(result.score)));
    const label = score >= 80 ? "hot" : score >= 40 ? "warm" : "cold";

    return new Response(JSON.stringify({ score, label, reasoning: result.reasoning }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-lead-score error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
