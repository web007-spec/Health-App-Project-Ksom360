import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useEngineMode } from "@/hooks/useEngineMode";
import { useEngineScores } from "@/hooks/useEngineScores";
import { useLevelProgression } from "@/hooks/useLevelProgression";
import {
  evaluatePlanGating,
  type PlanGatingMetadata,
  type ClientGatingContext,
  type PlanGatingResult,
} from "@/lib/planGating";
import { subDays, format } from "date-fns";
import { computeEngineScore, DailyInputs } from "@/lib/recommendationEngine";

export function usePlanGating() {
  const clientId = useEffectiveClientId();
  const { engineMode } = useEngineMode();
  const { data: scores } = useEngineScores();
  const { progression } = useLevelProgression();

  // Fetch overrides for this client
  const { data: overrides = [] } = useQuery({
    queryKey: ["coach-plan-overrides", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("coach_plan_overrides")
        .select("plan_id")
        .eq("client_id", clientId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  // Compute 14-day needs_support count
  const { data: stabilityData } = useQuery({
    queryKey: ["plan-gating-stability", clientId, engineMode],
    queryFn: async () => {
      if (!clientId) return { needsSupportDays: 0, avg7: 0 };

      const since = format(subDays(new Date(), 14), "yyyy-MM-dd");
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
      const workoutDates = new Set(
        workouts.filter((w: any) => w.completed_at).map((w: any) => w.scheduled_date).filter(Boolean)
      );

      let needsSupportDays = 0;
      const scores7: number[] = [];

      for (let i = 0; i < 14; i++) {
        const date = format(subDays(new Date(), i), "yyyy-MM-dd");
        const checkin = checkins.find((c: any) => c.checkin_date === date);

        const dayInput: DailyInputs[] = [{
          sleepHours: checkin?.sleep_hours ?? null,
          sleepQuality: checkin?.sleep_quality ?? null,
          nutritionOnTrack: checkin?.nutrition_on_track ?? null,
          recoveryCompleted: checkin?.recovery_completed ?? null,
          fastCompleted: !!checkin,
          workoutCompleted: workoutDates.has(date),
        }];

        const result = computeEngineScore(engineMode, dayInput, fastingEnabled);
        if (result.status === "needs_support") needsSupportDays++;
        if (i < 7) scores7.push(result.score);
      }

      const avg7 = scores7.length > 0 ? scores7.reduce((a, b) => a + b, 0) / scores7.length : 0;
      return { needsSupportDays, avg7 };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  const overriddenPlanIds = new Set(overrides.map((o: any) => o.plan_id));
  const primaryScore = scores?.[0];

  const context: ClientGatingContext = {
    engineMode,
    currentLevel: progression?.currentLevel ?? 1,
    scoreStatus: primaryScore?.status ?? "moderate",
    last7DayAvgScore: stabilityData?.avg7 ?? 50,
    needsSupportDaysLast14: stabilityData?.needsSupportDays ?? 0,
    fastingEnabled: true, // will be refined by featureSettings
    lowestFactor: primaryScore?.lowestFactor?.factor ?? "sleep",
    upcomingGameOrPractice: false, // could be connected to sport schedule
    overriddenPlanIds,
  };

  function evaluatePlan(plan: PlanGatingMetadata): PlanGatingResult {
    return evaluatePlanGating(plan, context);
  }

  return {
    evaluatePlan,
    context,
    isReady: !!scores && !!progression,
  };
}
