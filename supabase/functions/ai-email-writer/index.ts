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

    const { course_name, audience, offer, goal, tone, lead_name } = await req.json();

    const prompt = `Generate a follow-up email for a CRM lead.

Details:
- Lead name: ${lead_name || "there"}
- Course/Service: ${course_name || "our program"}
- Target audience: ${audience || "professionals"}
- Offer: ${offer || "enrollment"}
- Goal: ${goal || "conversion"}
- Tone: ${tone || "friendly"}

Generate a compelling email with subject line, body with personalization, and a clear CTA.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert email copywriter for coaches and course creators. Write persuasive, warm emails." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_email",
            description: "Return the generated email",
            parameters: {
              type: "object",
              properties: {
                subject: { type: "string", description: "Email subject line" },
                body: { type: "string", description: "Full email body with greeting and CTA" },
                cta_text: { type: "string", description: "Call to action button text" },
              },
              required: ["subject", "body", "cta_text"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_email" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let result = { subject: "", body: "", cta_text: "Learn More" };

    if (toolCall?.function?.arguments) {
      try { result = JSON.parse(toolCall.function.arguments); } catch {}
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-email-writer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
