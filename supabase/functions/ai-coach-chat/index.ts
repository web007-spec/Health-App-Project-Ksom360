import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, client_context } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const engine = client_context?.engine_mode || "performance";
    let toneInstruction = "Use a professional coaching tone.";
    if (engine === "metabolic") toneInstruction = "Use a structured, clinical tone. Focus on metabolic health and fasting.";
    else if (engine === "performance") toneInstruction = "Use a confident, direct tone. Focus on training and performance.";
    else if (engine === "athletic") toneInstruction = "Use an energetic, growth-oriented tone. Focus on competitive development.";

    const systemPrompt = `You are an AI coaching assistant embedded inside a professional fitness coaching platform.
You are speaking to the COACH (trainer), not the client. Help the coach with:
- Analyzing client data and trends
- Suggesting training adjustments
- Drafting messages or plans
- Answering fitness programming questions
- Providing evidence-based coaching insights

${toneInstruction}

CLIENT CONTEXT:
- Engine: ${engine}
- Level: ${client_context?.current_level || 1} (Band: ${client_context?.level_band || "1-3"})
- Readiness Score: ${client_context?.readiness_score ?? "N/A"}/100
- Status: ${client_context?.status || "moderate"}
- Lowest Factor: ${client_context?.lowest_factor || "N/A"}
- Weekly Completion: ${client_context?.weekly_completion_pct ?? "N/A"}%
- 7-Day Trend: ${client_context?.last_7_day_trend || "flat"}

SAFETY RULES:
- NEVER give medical advice or diagnose conditions
- NEVER override coach decisions — you are an assistant only
- Keep responses concise and actionable
- All suggestions are recommendations for the coach to evaluate`;

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
          ...(messages || []),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream through to client
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("AI coach chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
