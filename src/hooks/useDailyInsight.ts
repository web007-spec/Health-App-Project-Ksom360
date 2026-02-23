import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useEngineMode } from "@/hooks/useEngineMode";
import { useEngineScores } from "@/hooks/useEngineScores";
import { useLevelProgression } from "@/hooks/useLevelProgression";
import { selectInsight } from "@/lib/insightSelector";
import type { InsightEntry } from "@/lib/insightLibrary";
import { format, subDays } from "date-fns";

interface DailyInsight {
  message: string;
  action?: string;
  source: "pinned" | "custom" | "library";
  insightId?: string;
  engineMode: string;
  factorTag?: string;
  statusTag?: string;
}

export function useDailyInsight() {
  const clientId = useEffectiveClientId();
  const { engineMode } = useEngineMode();
  const { data: scores } = useEngineScores();
  const { progression } = useLevelProgression();

  return useQuery({
    queryKey: ["daily-insight", clientId, engineMode, scores?.[0]?.score, progression?.currentLevel],
    queryFn: async (): Promise<DailyInsight | null> => {
      if (!clientId) return null;

      // 1. Check if insights are disabled
      const { data: settings } = await supabase
        .from("client_feature_settings")
        .select("insights_enabled, pinned_insight_text, pinned_insight_until")
        .eq("client_id", clientId)
        .maybeSingle();

      if (!settings?.insights_enabled) return null;

      // 2. Check for pinned insight (coach override, valid for 24h)
      if (settings.pinned_insight_text && settings.pinned_insight_until) {
        const until = new Date(settings.pinned_insight_until);
        if (until > new Date()) {
          return {
            message: settings.pinned_insight_text,
            source: "pinned",
            engineMode,
          };
        }
      }

      // 3. Check for active custom coach insight
      const { data: customInsights } = await supabase
        .from("coach_custom_insights")
        .select("message, action_text, engine_mode")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (customInsights && customInsights.length > 0) {
        const ci = customInsights[0];
        if (!ci.engine_mode || ci.engine_mode === engineMode) {
          return {
            message: ci.message,
            action: ci.action_text ?? undefined,
            source: "custom",
            engineMode,
          };
        }
      }

      // 4. Check today's already-shown insight
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: todayHistory } = await supabase
        .from("client_insight_history")
        .select("insight_id, factor_tag, status_tag")
        .eq("client_id", clientId)
        .eq("shown_date", today)
        .maybeSingle();

      // 5. Get recent 7 days of insight IDs to avoid repeats
      const since = format(subDays(new Date(), 7), "yyyy-MM-dd");
      const { data: recentHistory } = await supabase
        .from("client_insight_history")
        .select("insight_id")
        .eq("client_id", clientId)
        .gte("shown_date", since);

      const recentIds = (recentHistory || []).map((r: any) => r.insight_id);

      // Get scoring context
      const primaryScore = scores?.[0];
      const lowestFactor = primaryScore?.lowestFactor?.factor || "sleep";
      const status = primaryScore?.status || "moderate";
      const currentLevel = progression?.currentLevel || 1;

      // 6. Select or reuse today's insight
      let selectedInsight: InsightEntry;
      if (todayHistory?.insight_id) {
        // Already shown today — find it in library
        const { INSIGHT_LIBRARY } = await import("@/lib/insightLibrary");
        const found = INSIGHT_LIBRARY.find((ins) => ins.id === todayHistory.insight_id);
        if (found) {
          return {
            message: found.message,
            action: found.action,
            source: "library",
            insightId: found.id,
            engineMode,
            factorTag: found.factor,
            statusTag: found.status,
          };
        }
      }

      // Select new insight
      selectedInsight = selectInsight(engineMode, currentLevel, status, lowestFactor, recentIds);

      // Record it (upsert for today)
      await supabase
        .from("client_insight_history")
        .upsert(
          {
            client_id: clientId,
            insight_id: selectedInsight.id,
            shown_date: today,
            engine_mode: engineMode,
            factor_tag: selectedInsight.factor,
            status_tag: selectedInsight.status,
          } as any,
          { onConflict: "client_id,shown_date" }
        );

      return {
        message: selectedInsight.message,
        action: selectedInsight.action,
        source: "library",
        insightId: selectedInsight.id,
        engineMode,
        factorTag: selectedInsight.factor,
        statusTag: selectedInsight.status,
      };
    },
    enabled: !!clientId && !!scores,
    staleTime: 30 * 60 * 1000, // 30 min — insight is daily
  });
}
