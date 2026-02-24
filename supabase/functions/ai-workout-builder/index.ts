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
    const { exercises, client_context, preferences } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an AI workout builder for a professional fitness coaching platform.

SAFETY:
- Never give medical advice. You are creating workout drafts for a coach to review.
- Always respect the client's level and engine mode.
- All output is a DRAFT for coach approval.

CLIENT CONTEXT:
- Engine: ${client_context?.engine_mode || "performance"}
- Level: ${client_context?.current_level || 1} (Band: ${client_context?.level_band || "1-3"})
- Status: ${client_context?.status || "moderate"}

AVAILABLE EXERCISES (use ONLY these exercise IDs):
${(exercises || []).map((e: any) => `- ID: ${e.id} | Name: ${e.name} | Muscle: ${e.muscle_group || "General"} | Equipment: ${e.equipment || "None"}`).join("\n")}

PREFERENCES:
- Focus: ${preferences?.focus || "full body"}
- Duration: ${preferences?.duration || "45"} minutes
- Difficulty: ${preferences?.difficulty || "intermediate"}
- Equipment available: ${preferences?.equipment || "all"}
- Goal: ${preferences?.goal || "general fitness"}

Generate a structured workout using ONLY the exercise IDs provided above. Return a JSON object with this exact structure:
{
  "name": "Workout Name",
  "instructions": "Brief workout description",
  "difficulty": "beginner|intermediate|advanced",
  "exercises": [
    {
      "exercise_id": "uuid-from-list-above",
      "sets": 3,
      "target_type": "text",
      "target_value": "8-12 reps",
      "rest_seconds": 60,
      "order_index": 0
    }
  ]
}

Rules:
- Use 4-8 exercises total
- Only use exercise IDs from the provided list
- Match difficulty to client level (1-3 = beginner, 4-6 = intermediate, 7 = advanced)
- For metabolic engine: include compound movements, moderate rest
- For performance engine: progressive overload focus, adequate rest
- For athletic engine: sport-specific movements, dynamic exercises
- Return ONLY valid JSON, no markdown or extra text`;

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
          { role: "user", content: `Generate a ${preferences?.focus || "full body"} workout for this client. Return only JSON.` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content || "";

    // Strip markdown code fences if present
    text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let workout;
    try {
      workout = JSON.parse(text);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: text }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ workout }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("AI workout builder error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
