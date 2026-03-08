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

    const { lead, notes, follow_ups } = await req.json();

    const prompt = `Analyze this CRM lead and provide sales intelligence.

Lead:
- Name: ${lead.name}
- Email: ${lead.email || "N/A"}
- Phone: ${lead.phone || "N/A"}
- Source: ${lead.source || "unknown"}
- Status: ${lead.status}
- Pipeline Value: ₹${lead.pipeline_value || 0}
- Tags: ${(lead.tags || []).join(", ") || "none"}
- Created: ${lead.created_at}
- Lead Score: ${lead.lead_score || "not scored"}

Notes (${(notes || []).length}):
${(notes || []).slice(0, 5).map((n: any) => `- ${n.content}`).join("\n") || "No notes"}

Follow-ups (${(follow_ups || []).length}):
${(follow_ups || []).slice(0, 5).map((f: any) => `- ${f.task} (${f.status}, due: ${f.due_date})`).join("\n") || "No follow-ups"}

Provide actionable sales insights.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert sales coach AI. Provide actionable, specific sales recommendations." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "sales_analysis",
            description: "Return sales intelligence for this lead",
            parameters: {
              type: "object",
              properties: {
                purchase_probability: { type: "number", description: "Purchase probability 0-100" },
                recommended_action: { type: "string", description: "Best next action to take" },
                best_contact_time: { type: "string", description: "Suggested best time to reach out" },
                follow_up_message: { type: "string", description: "Suggested follow-up message" },
                insights: { type: "array", items: { type: "string" }, description: "3-5 key insights about this lead" },
              },
              required: ["purchase_probability", "recommended_action", "best_contact_time", "follow_up_message", "insights"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "sales_analysis" } },
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
    let result = { purchase_probability: 50, recommended_action: "Follow up", best_contact_time: "Morning", follow_up_message: "", insights: [] };

    if (toolCall?.function?.arguments) {
      try { result = JSON.parse(toolCall.function.arguments); } catch {}
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-sales-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
