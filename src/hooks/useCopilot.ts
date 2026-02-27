import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CopilotContext } from "@/lib/buildCopilotContext";

export type CopilotUseCase = "plan_suggestion" | "level_up" | "insight_rephrase" | "insight_pin_suggest" | "custom_insight_suggest" | "nudge_message_suggest" | "client_feedback" | "progress_report" | "alert_message";

export interface CopilotStyleSettings {
  tone: "casual" | "formal" | "storytelling";
  length: "short" | "medium" | "long";
  emoji_level: "none" | "some" | "lots";
}

interface UseCopilotOptions {
  clientId: string;
  coachId: string;
  engineMode: string;
}

export function useCopilot({ clientId, coachId, engineMode }: UseCopilotOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastResponse, setLastResponse] = useState<string | null>(null);

  const generate = async (
    useCase: CopilotUseCase,
    context: CopilotContext,
    originalText?: string,
    styleSettings?: CopilotStyleSettings,
  ) => {
    setIsGenerating(true);
    setLastResponse(null);

    try {
      // ── Authority gate: ai_suggestions_enabled ──
      const { data: authorityRow } = await supabase
        .from("client_feature_settings")
        .select("ai_suggestions_enabled, engine_mode, subscription_tier")
        .eq("client_id", clientId)
        .maybeSingle();

      const { checkAuthorityGate } = await import("@/lib/featureAccessGuard");
      const engine = (authorityRow?.engine_mode || engineMode) as import("@/lib/engineConfig").EngineMode;
      const tier = (authorityRow?.subscription_tier || "starter") as import("@/lib/featureAccessGuard").SubscriptionTier;

      if (!checkAuthorityGate(tier, engine, !!authorityRow?.ai_suggestions_enabled)) {
        const { logAuthorityBlocked } = await import("@/lib/systemEvents");
        await logAuthorityBlocked(clientId, `copilot_${useCase}`, engine, tier, {
          ai_suggestions_enabled: !!authorityRow?.ai_suggestions_enabled,
        });
        toast.error("AI suggestions are not enabled for this client.");
        return null;
      }

      const { data, error } = await supabase.functions.invoke("ai-coach-copilot", {
        body: {
          use_case: useCase,
          context,
          original_text: originalText,
          style_settings: styleSettings,
        },
      });

      if (error) throw error;

      const text = data?.text || "No response generated.";
      setLastResponse(text);

      // Save to copilot_messages
      await supabase.from("copilot_messages").insert({
        client_id: clientId,
        coach_id: coachId,
        use_case: useCase,
        engine_mode: engineMode,
        prompt_context: context as any,
        response_text: text,
      });

      // Log copilot event
      await supabase.from("copilot_events").insert({
        event_type: `copilot_${useCase}`,
        engine_mode: engineMode,
        coach_id: coachId,
        client_id: clientId,
      });

      return text;
    } catch (err: any) {
      console.error("Copilot generation failed:", err);
      toast.error(err?.message || "Failed to generate AI suggestion");
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const approve = async (messageId: string) => {
    const { error } = await supabase
      .from("copilot_messages")
      .update({ approved: true })
      .eq("id", messageId);

    if (error) {
      toast.error("Failed to approve message");
      return false;
    }

    // Log approval
    await supabase.from("copilot_events").insert({
      event_type: "copilot_approved",
      engine_mode: engineMode,
      coach_id: coachId,
      client_id: clientId,
      approved: true,
    });

    toast.success("AI draft approved");
    return true;
  };

  return {
    generate,
    approve,
    isGenerating,
    lastResponse,
    clearResponse: () => setLastResponse(null),
  };
}
