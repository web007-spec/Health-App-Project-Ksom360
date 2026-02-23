import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useEngineMode } from "@/hooks/useEngineMode";
import { useEngineScores } from "@/hooks/useEngineScores";
import { useLevelProgression } from "@/hooks/useLevelProgression";
import {
  generateRecommendation,
  getTrendDirection,
  type RecommendationInput,
  type RecommendationOutput,
  type PlanSuggestionType,
} from "@/lib/recommendationRules";
import { computeEngineScore, DailyInputs } from "@/lib/recommendationEngine";
import { format, subDays } from "date-fns";

export interface AdaptiveRecommendation extends RecommendationOutput {
  scoreTotal: number;
  status: string;
  lowestFactor: string;
  engineMode: string;
  trendDirection: string;
  coachApproved: boolean;
}

export function useAdaptiveRecommendation() {
  const clientId = useEffectiveClientId();
  const { engineMode } = useEngineMode();
  const { data: scores } = useEngineScores();
  const { progression } = useLevelProgression();

  return useQuery({
    queryKey: ["adaptive-recommendation", clientId, engineMode, scores?.[0]?.score],
    queryFn: async (): Promise<AdaptiveRecommendation | null> => {
      if (!clientId || !scores?.[0]) return null;

      const primary = scores[0];
      const today = format(new Date(), "yyyy-MM-dd");

      // Check if we already have today's recommendation
      const { data: existing } = await supabase
        .from("recommendation_events")
        .select("*")
        .eq("client_id", clientId)
        .eq("date", today)
        .maybeSingle();

      if (existing) {
        return {
          todayText: existing.today_recommendation_text,
          weekText: existing.week_recommendation_text,
          planSuggestion: existing.plan_suggestion_type
            ? {
                type: existing.plan_suggestion_type as PlanSuggestionType,
                text: existing.plan_suggestion_text || "",
                coachOverrideRequired: existing.coach_override_required,
              }
            : null,
          scoreTotal: existing.score_total,
          status: existing.status,
          lowestFactor: existing.lowest_factor || "sleep",
          engineMode: existing.engine_mode,
          trendDirection: "flat",
          coachApproved: existing.coach_approved,
        };
      }

      // Fetch 14 days of data for trend calculation
      const since = format(subDays(new Date(), 14), "yyyy-MM-dd");
      const [checkinsRes, workoutsRes, featureRes, sportScheduleRes] = await Promise.all([
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
          .select("fasting_enabled, current_level, level_start_date")
          .eq("client_id", clientId)
          .maybeSingle(),
        engineMode === "athletic"
          ? supabase
              .from("client_ical_feeds")
              .select("id")
              .eq("client_id", clientId)
              .eq("is_active", true)
              .limit(1)
          : Promise.resolve({ data: [] }),
      ]);

      const checkins = checkinsRes.data || [];
      const workouts = workoutsRes.data || [];
      const fastingEnabled = featureRes.data?.fasting_enabled ?? true;
      const currentLevel = featureRes.data?.current_level ?? 1;
      const levelStartDate = featureRes.data?.level_start_date;
      const hasActiveSportFeed = (sportScheduleRes.data || []).length > 0;

      const workoutDates = new Set(
        workouts.filter((w: any) => w.completed_at).map((w: any) => w.scheduled_date).filter(Boolean)
      );

      // Build daily scores for last 14 days
      const dailyScores: number[] = [];
      let needsSupportCount = 0;

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
        dailyScores.push(result.score);
        if (result.status === "needs_support") needsSupportCount++;
      }

      const last7Avg = dailyScores.slice(0, 7).reduce((s, v) => s + v, 0) / Math.max(dailyScores.slice(0, 7).length, 1);
      const prior7Avg = dailyScores.slice(7, 14).reduce((s, v) => s + v, 0) / Math.max(dailyScores.slice(7, 14).length, 1);

      const daysInLevel = levelStartDate
        ? Math.floor((Date.now() - new Date(levelStartDate).getTime()) / 86400000)
        : 0;

      const input: RecommendationInput = {
        engineMode,
        currentLevel,
        scoreTotal: primary.score,
        scoreStatus: primary.status,
        lowestFactor: primary.lowestFactor.factor,
        streakDays: primary.streakDays,
        weeklyCompletionPct: primary.weeklyCompletionPct,
        last7DayAvgScore: Math.round(last7Avg),
        prior7DayAvgScore: Math.round(prior7Avg),
        fastingEnabled,
        upcomingGameOrPractice: hasActiveSportFeed,
        needsSupportDaysLast14: needsSupportCount,
        daysInLevel,
      };

      const recommendation = generateRecommendation(input);
      const trend = getTrendDirection(last7Avg, prior7Avg);

      // Persist to recommendation_events
      await supabase
        .from("recommendation_events")
        .upsert(
          {
            client_id: clientId,
            date: today,
            engine_mode: engineMode,
            score_total: primary.score,
            status: primary.status,
            lowest_factor: primary.lowestFactor.factor,
            today_recommendation_text: recommendation.todayText,
            week_recommendation_text: recommendation.weekText,
            plan_suggestion_type: recommendation.planSuggestion?.type || null,
            plan_suggestion_text: recommendation.planSuggestion?.text || null,
            coach_override_required: recommendation.planSuggestion?.coachOverrideRequired ?? true,
          } as any,
          { onConflict: "client_id,date" }
        );

      return {
        ...recommendation,
        scoreTotal: primary.score,
        status: primary.status,
        lowestFactor: primary.lowestFactor.factor,
        engineMode,
        trendDirection: trend,
        coachApproved: false,
      };
    },
    enabled: !!clientId && !!scores?.length,
    staleTime: 30 * 60 * 1000,
  });
}

/** Hook for trainer to fetch a specific client's recommendation */
export function useClientRecommendation(clientId: string | undefined) {
  return useQuery({
    queryKey: ["client-recommendation", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const today = format(new Date(), "yyyy-MM-dd");
      const { data } = await supabase
        .from("recommendation_events")
        .select("*")
        .eq("client_id", clientId)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Mutation for coach to approve a plan suggestion */
export function useApproveRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recommendationId }: { recommendationId: string }) => {
      const { error } = await supabase
        .from("recommendation_events")
        .update({
          coach_approved: true,
          coach_approved_at: new Date().toISOString(),
        } as any)
        .eq("id", recommendationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-recommendation"] });
      queryClient.invalidateQueries({ queryKey: ["adaptive-recommendation"] });
    },
  });
}
