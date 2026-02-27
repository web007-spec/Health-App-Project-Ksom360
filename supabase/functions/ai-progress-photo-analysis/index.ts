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
    const { image_urls, client_context, comparison_notes } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!image_urls || image_urls.length === 0) {
      return new Response(JSON.stringify({ error: "No images provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an AI body composition analysis assistant for a professional fitness coaching platform.
You are providing observations to the COACH (not the client). This is an internal analysis tool.

CLIENT CONTEXT:
- Engine: ${client_context?.engine_mode || "performance"}
- Level: ${client_context?.current_level || 1}
- Status: ${client_context?.status || "moderate"}

${comparison_notes ? `COACH NOTES: ${comparison_notes}` : ""}

Analyze the progress photo(s) and provide:

📊 VISUAL ASSESSMENT
- Observable changes in body composition (muscle definition, proportions, posture)
- Areas showing progress
- Areas that may need more focus

📐 POSTURE & ALIGNMENT
- Any noticeable postural observations
- Symmetry notes

💡 COACHING INSIGHTS
- Suggested focus areas based on visual assessment
- Training emphasis recommendations for the coach

SAFETY RULES:
- NEVER diagnose conditions or provide medical assessments
- NEVER estimate body fat percentage or weight — these require proper tools
- Focus on observable, objective visual changes only
- Be professional and clinical — this is for the coach's eyes only
- If image quality is poor, say so and suggest better photo standards
- Be encouraging but honest about observations`;

    const imageContent = image_urls.map((url: string) => ({
      type: "image_url",
      image_url: { url },
    }));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: `Analyze ${image_urls.length > 1 ? "these progress photos and compare them" : "this progress photo"}. Provide coaching insights.` },
              ...imageContent,
            ],
          },
        ],
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

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ analysis: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("AI photo analysis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
