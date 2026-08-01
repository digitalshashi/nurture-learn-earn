import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROMPTS: Record<string, { system: string; instructions: string }> = {
  ads: {
    system: "You are an expert direct-response ad copywriter for coaches and course creators.",
    instructions: "Write a short-form video ad script (30-45 seconds) for the offer/brief below. Include a hook, the problem, the offer, and a clear call to action.",
  },
  webinar: {
    system: "You are an expert webinar coach who scores transcripts against a proven conversion rubric.",
    instructions: "Score this webinar transcript 1-10 on each of: hook, offer clarity, objection handling, urgency, call to action. Give one specific improvement per criterion.",
  },
  showcase: {
    system: "You are a brand strategist helping a coach summarize their results into a compelling case study.",
    instructions: "Turn the input below into a short client-showcase script: situation, transformation, proof, and a one-line takeaway.",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const { type, input_text } = await req.json();
    const config = PROMPTS[type];
    if (!config) throw new Error("Unknown booster type");
    if (!input_text || !String(input_text).trim()) throw new Error("input_text is required");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: config.system },
          { role: "user", content: `${config.instructions}\n\n---\n${input_text}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "booster_result",
            description: "Return the booster output",
            parameters: {
              type: "object",
              properties: {
                output: { type: "string", description: "The generated script or written feedback, formatted with line breaks" },
                score: { type: "number", description: "Overall score 0-100 if this is a scoring task, otherwise omit or set to null" },
              },
              required: ["output"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "booster_result" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("OpenAI API error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let result: { output: string; score?: number | null } = { output: "" };
    if (toolCall?.function?.arguments) {
      try { result = JSON.parse(toolCall.function.arguments); } catch { /* fall through with empty output */ }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("growth-booster error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
