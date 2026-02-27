import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { computeEngineScore, EngineResult, DailyInputs } from "@/lib/recommendationEngine";
import { useEngineMode } from "@/hooks/useEngineMode";
import { subDays, format } from "date-fns";

export function useEngineScores() {
  const clientId = useEffectiveClientId();
  const { engineMode, config } = useEngineMode();

  return useQuery({
    queryKey: ["engine-scores", clientId, engineMode],
    queryFn: async (): Promise<EngineResult[]> => {
      if (!clientId) return [];

      const since = format(subDays(new Date(), 30), "yyyy-MM-dd");

      // Fetch check-ins, workout completions, and fasting settings in parallel
      const [checkinsRes, workoutsRes, featureRes] = await Promise.all([
        supabase
          .from("daily_checkins")
          .select("*")
          .eq("client_id", clientId)
          .gte("checkin_date", since)
          .order("checkin_date", { ascending: false }),
        supabase
          .from("client_workouts")
          .select("scheduled_date, completed_at")
          .eq("client_id", clientId)
          .gte("scheduled_date", since),
        supabase
          .from("client_feature_settings")
          .select("fasting_enabled")
          .eq("client_id", clientId)
          .maybeSingle(),
      ]);

      const checkins = checkinsRes.data || [];
      const workouts = workoutsRes.data || [];
      const fastingEnabled = featureRes.data?.fasting_enabled ?? true;

      // Build a set of dates with completed workouts
      const workoutCompletedDates = new Set(
        workouts
          .filter((w: any) => w.completed_at)
          .map((w: any) => w.scheduled_date)
          .filter(Boolean)
      );

      const days: DailyInputs[] = [];
      for (let i = 0; i < 30; i++) {
        const date = format(subDays(new Date(), i), "yyyy-MM-dd");
        const checkin = checkins.find((c: any) => c.checkin_date === date);
        days.push({
          sleepHours: checkin?.sleep_hours ?? null,
          sleepQuality: checkin?.sleep_quality ?? null,
          nutritionOnTrack: checkin?.nutrition_on_track ?? null,
          recoveryCompleted: checkin?.recovery_completed ?? null,
          fastCompleted: !!checkin,
          workoutCompleted: workoutCompletedDates.has(date),
        });
      }

      const primaryResult = computeEngineScore(engineMode, days, fastingEnabled);
      return [primaryResult];
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });
}
