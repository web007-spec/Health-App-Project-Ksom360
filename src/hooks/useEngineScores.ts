import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { computeAllEngines, EngineResult, CheckinDay } from "@/lib/recommendationEngine";
import { subDays, format } from "date-fns";

export function useEngineScores() {
  const clientId = useEffectiveClientId();

  return useQuery({
    queryKey: ["engine-scores", clientId],
    queryFn: async (): Promise<EngineResult[]> => {
      if (!clientId) return [];

      const since = format(subDays(new Date(), 30), "yyyy-MM-dd");

      // Fetch last 30 days of check-ins
      const { data: checkins } = await supabase
        .from("daily_checkins")
        .select("*")
        .eq("client_id", clientId)
        .gte("checkin_date", since)
        .order("checkin_date", { ascending: false });

      // Fetch fasting completion data (last_fast_completed_at from feature settings gives last completion,
      // but we need daily data — use fasting_logs if available, otherwise approximate from checkins)
      // For now, we treat a day as "fast completed" if a check-in exists for that day
      // This can be enhanced later with actual fasting session data
      const { data: featureSettings } = await supabase
        .from("client_feature_settings")
        .select("last_fast_completed_at")
        .eq("client_id", clientId)
        .maybeSingle();

      const days: CheckinDay[] = [];
      for (let i = 0; i < 30; i++) {
        const date = format(subDays(new Date(), i), "yyyy-MM-dd");
        const checkin = (checkins || []).find((c: any) => c.checkin_date === date);
        days.push({
          sleepHours: checkin?.sleep_hours ?? null,
          sleepQuality: checkin?.sleep_quality ?? null,
          nutritionOnTrack: checkin?.nutrition_on_track ?? null,
          recoveryCompleted: checkin?.recovery_completed ?? null,
          fastCompleted: !!checkin, // presence of checkin = engaged that day
        });
      }

      return computeAllEngines(days);
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });
}
