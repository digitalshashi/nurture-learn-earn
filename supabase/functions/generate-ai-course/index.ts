import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { action, topic, audience, level, duration, language, instructions } = await req.json();

    // Fetch coach's AI settings
    const { data: settings } = await supabase
      .from("ai_settings")
      .select("*")
      .eq("coach_id", user.id)
      .single();

    if (!settings?.openai_api_key) {
      return new Response(JSON.stringify({ error: "OpenAI API key not configured. Go to Settings → AI Settings." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiKey = settings.openai_api_key;
    const model = settings.model || "gpt-4o-mini";
    const temperature = settings.temperature || 0.7;
    const maxTokens = settings.max_tokens || 3000;

    // Test connection
    if (action === "test") {
      const testRes = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${openaiKey}` },
      });
      const ok = testRes.ok;
      const body = await testRes.text();
      return new Response(JSON.stringify({ success: ok, message: ok ? "Connection successful!" : "Invalid API key" }), {
        status: ok ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate course
    if (action === "generate") {
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

      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "You are an expert course creator. Always return valid JSON only, no markdown." },
            { role: "user", content: prompt },
          ],
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (!openaiRes.ok) {
        const errText = await openaiRes.text();
        console.error("OpenAI error:", openaiRes.status, errText);
        let userMessage = `OpenAI API error (${openaiRes.status})`;
        if (openaiRes.status === 429) {
          const isQuota = errText.includes("insufficient_quota");
          userMessage = isQuota
            ? "Your OpenAI API key has exceeded its quota. Please check your OpenAI billing at platform.openai.com and ensure you have credits available."
            : "OpenAI rate limit reached. Please wait a moment and try again.";
        } else if (openaiRes.status === 401) {
          userMessage = "Invalid OpenAI API key. Please check your key in Settings → AI Settings.";
        }
        return new Response(JSON.stringify({ error: userMessage }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const openaiData = await openaiRes.json();
      const content = openaiData.choices?.[0]?.message?.content || "";
      
      // Parse JSON from response (handle potential markdown wrapping)
      let courseData;
      try {
        const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        courseData = JSON.parse(jsonStr);
      } catch {
        return new Response(JSON.stringify({ error: "Failed to parse AI response. Try again.", raw: content }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tokensUsed = openaiData.usage?.total_tokens || 0;

      return new Response(JSON.stringify({ course: courseData, tokens_used: tokensUsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-ai-course error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
