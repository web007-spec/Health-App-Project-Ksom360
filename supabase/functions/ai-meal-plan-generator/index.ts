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
    const { recipes, macro_targets, preferences, client_context } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an AI meal plan generator for a professional fitness coaching platform.

SAFETY:
- Never give medical or dietary advice. You are creating meal plan drafts for a coach to review.
- All output is a DRAFT for coach approval.

CLIENT CONTEXT:
- Engine: ${client_context?.engine_mode || "performance"}
- Level: ${client_context?.current_level || 1}

MACRO TARGETS:
- Daily Calories: ${macro_targets?.target_calories || "Not set"}
- Protein: ${macro_targets?.target_protein || "Not set"}g
- Carbs: ${macro_targets?.target_carbs || "Not set"}g
- Fats: ${macro_targets?.target_fats || "Not set"}g
- Diet Style: ${macro_targets?.diet_style || "balanced"}

AVAILABLE RECIPES (use ONLY these recipe IDs):
${(recipes || []).slice(0, 50).map((r: any) => `- ID: ${r.id} | ${r.name} | Cal: ${r.calories || "?"} | P: ${r.protein || "?"}g C: ${r.carbs || "?"}g F: ${r.fat || "?"}g | Category: ${r.category || "General"}`).join("\n")}

PREFERENCES:
- Days: ${preferences?.days || 7}
- Meals per day: ${preferences?.meals_per_day || 3}
- Diet restrictions: ${preferences?.restrictions || "none"}
- Goal: ${preferences?.goal || "general health"}

Generate a structured meal plan using ONLY recipe IDs from the list above. Return JSON:
{
  "name": "Meal Plan Name",
  "description": "Brief description",
  "days": [
    {
      "day": 1,
      "meals": [
        { "meal_type": "breakfast", "recipe_id": "uuid", "servings": 1 },
        { "meal_type": "lunch", "recipe_id": "uuid", "servings": 1 },
        { "meal_type": "dinner", "recipe_id": "uuid", "servings": 1 }
      ],
      "estimated_calories": 2000,
      "estimated_protein": 150
    }
  ]
}

Rules:
- Only use recipe IDs from the provided list
- Try to hit the macro targets as closely as possible
- Vary meals across days — avoid repeating the same recipe more than twice per week
- For metabolic engine: focus on nutrient timing, anti-inflammatory foods
- For performance engine: prioritize protein, adequate carbs for training
- For athletic engine: performance fuel, recovery nutrition
- Return ONLY valid JSON`;

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
          { role: "user", content: `Generate a ${preferences?.days || 7}-day meal plan. Return only JSON.` },
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
    text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let mealPlan;
    try {
      mealPlan = JSON.parse(text);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: text }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ meal_plan: mealPlan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("AI meal plan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
