import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useEngineMode } from "@/hooks/useEngineMode";
import { useEngineScores } from "@/hooks/useEngineScores";
import {
  evaluateLevelEligibility,
  getLevelDefinition,
  LevelProgressionState,
  DailyScoreEntry,
} from "@/lib/levelProgression";
import { subDays, differenceInDays, format, parseISO } from "date-fns";
import { computeEngineScore, DailyInputs } from "@/lib/recommendationEngine";

export function useLevelProgression() {
  const clientId = useEffectiveClientId();
  const { engineMode, config } = useEngineMode();
  const { data: engineScores } = useEngineScores();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["level-progression", clientId, engineMode],
    queryFn: async (): Promise<LevelProgressionState> => {
      if (!clientId) throw new Error("No client ID");

      // Fetch current level state
      const { data: settings } = await supabase
        .from("client_feature_settings")
        .select("current_level, level_start_date, level_completion_pct, level_status, auto_advance_levels")
        .eq("client_id", clientId)
        .maybeSingle();

      const currentLevel = settings?.current_level ?? 1;
      const levelStartDate = settings?.level_start_date
        ? parseISO(settings.level_start_date)
        : new Date();
      const levelStatus = (settings?.level_status as any) ?? "active";
      const daysInLevel = differenceInDays(new Date(), levelStartDate);

      // Fetch last 14 days of check-ins + workouts for scoring
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

      // Build per-day scores for last 14 days
      const dailyScores: DailyScoreEntry[] = [];
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
        dailyScores.push({
          score: result.score,
          status: result.status,
          completed: !!checkin || workoutDates.has(date),
        });
      }

      const streak = engineScores?.[0]?.streakDays ?? 0;
      const { isEligible, completionPct, criteria } = evaluateLevelEligibility(
        currentLevel,
        daysInLevel,
        dailyScores,
        streak,
      );

      const levelDef = getLevelDefinition(currentLevel);

      return {
        currentLevel,
        levelName: levelDef.name,
        levelStatus: isEligible ? "eligible" : levelStatus,
        completionPct: currentLevel >= 7 ? 100 : completionPct,
        daysInLevel,
        isEligible,
        isMastery: currentLevel >= 7,
        criteria,
        nextLevel: currentLevel < 7 ? getLevelDefinition(currentLevel + 1) : null,
      };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  const advanceLevel = useMutation({
    mutationFn: async () => {
      if (!clientId || !data?.isEligible) throw new Error("Not eligible");
      const newLevel = Math.min(data.currentLevel + 1, 7);
      const { error } = await supabase
        .from("client_feature_settings")
        .update({
          current_level: newLevel,
          level_start_date: new Date().toISOString().split("T")[0],
          level_completion_pct: 0,
          level_status: newLevel >= 7 ? "completed" : "active",
        } as any)
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["level-progression"] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings"] });
    },
  });

  return {
    progression: data ?? null,
    isLoading,
    advanceLevel: advanceLevel.mutate,
    isAdvancing: advanceLevel.isPending,
  };
}
