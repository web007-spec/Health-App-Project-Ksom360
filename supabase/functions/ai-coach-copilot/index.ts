import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SAFETY_RULES = `
SAFETY CONSTRAINTS — You MUST follow these rules:
- NEVER give medical advice or diagnose conditions.
- NEVER change nutrition plans autonomously.
- NEVER override coach decisions — you are a drafting assistant only.
- NEVER modify billing, subscription, or level state.
- NEVER expose sensitive client data (emails, passwords, payment info).
- All responses are DRAFTS requiring coach approval before reaching the client.
- Keep responses concise (2-4 sentences for suggestions, 2-3 sentences for level-up messages).
`;

function buildSystemPrompt(useCase: string, context: Record<string, unknown>): string {
  const engine = context.engine_mode || "performance";
  let toneInstruction = "Use a professional coaching tone.";
  if (engine === "metabolic") toneInstruction = "Use a structured, clinical tone. Focus on metabolic stability and fasting adherence.";
  else if (engine === "performance") toneInstruction = "Use a confident, direct tone. Focus on training readiness and performance.";
  else if (engine === "athletic") toneInstruction = "Use an energetic, growth-oriented tone. Focus on recovery and competitive development.";

  const levelBand = context.level_band || "1-3";
  const levelContext = levelBand === "7"
    ? "This client is at Mastery Level 7 — focus on optimization and fine-tuning."
    : levelBand === "4-6"
    ? "This client is at an intermediate level — encourage progression while maintaining consistency."
    : "This client is at a foundational level — focus on building habits and fundamentals.";

  const base = `You are an AI Coach Copilot for the KSOM360 platform.
${toneInstruction}
${levelContext}
${SAFETY_RULES}

Client context:
- Engine: ${context.engine_mode}
- Level: ${context.current_level} (Band: ${context.level_band})
- Readiness Score: ${context.readiness_score ?? "N/A"}/100
- Status: ${context.status}
- Lowest Factor: ${context.lowest_factor || "N/A"}
- Weekly Completion: ${context.weekly_completion_pct ?? "N/A"}%
- Streak Days: ${context.streak_days ?? "N/A"}
- 7-Day Trend: ${context.last_7_day_trend}
- Parent Link Active: ${context.parent_link_active}
`;

  switch (useCase) {
    case "plan_suggestion":
      return `${base}
Generate a plan adjustment suggestion for the coach to review. Include:
1. Suggested adjustment (1 sentence)
2. Reasoning based on the lowest scoring factor (1-2 sentences)
3. Risk flags if any (1 sentence, or "No risk flags." if none)
Do NOT auto-apply. This is a draft for coach approval.`;

    case "level_up":
      return `${base}
The client has met Level Up eligibility criteria. Generate:
1. A personalized reinforcement message (1-2 sentences)
2. A growth insight specific to their engine and level (1-2 sentences)
This will be shown to the client as a system insight after coach approval.`;

    case "insight_rephrase":
      return `${base}
Rephrase the following insight message to better match the client's engine tone, level band, and current status. Keep the core meaning intact. Do NOT add medical advice or freeform recommendations. Return only the rephrased message.`;

    case "insight_pin_suggest":
      return `${base}
Generate a short, impactful daily insight message (1-2 sentences) that a coach can pin to this client's dashboard for 24 hours. The insight should:
1. Be specific to the client's current status, lowest factor, and engine mode
2. Include a motivational or actionable element
3. Match the engine tone perfectly
Return ONLY the insight text, nothing else.`;

    case "custom_insight_suggest":
      return `${base}
Generate a custom daily insight with an action line for this client. Return in this exact format:
MESSAGE: [1-2 sentence insight matching the engine tone and client context]
ACTION: [short actionable task for today, e.g. "Drink 3L water today"]
Base the insight on the client's lowest scoring factor, current status, and trend direction.`;

    case "nudge_message_suggest":
      return `${base}
Generate a short push notification message (max 100 characters) to nudge this client based on their current status and lowest factor. The message should feel personal and motivating, not generic. Match the engine tone.
Return ONLY the notification text, nothing else.`;

    default:
      return base;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { use_case, context, original_text } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = buildSystemPrompt(use_case, context || {});

    let userMessage: string;
    if (use_case === "insight_rephrase" && original_text) {
      userMessage = `Rephrase this insight: "${original_text}"`;
    } else if (use_case === "insight_pin_suggest") {
      userMessage = "Generate a pinnable daily insight for this client based on their context.";
    } else if (use_case === "custom_insight_suggest") {
      userMessage = "Generate a custom insight with an action line for this client.";
    } else if (use_case === "nudge_message_suggest") {
      userMessage = "Generate a short nudge notification message for this client.";
    } else {
      userMessage = `Generate the ${use_case === "plan_suggestion" ? "plan adjustment suggestion" : "level-up message"} based on the client context provided.`;
    }

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
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Copilot error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
