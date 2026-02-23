/**
 * Recommendation Engine — Engine-Specific Scoring
 *
 * Metabolic Stability Index:   fasting 40%, sleep 20%, nutrition 20%, weekly completion 20%
 * Performance Readiness Score:  workout 35%, sleep 20%, recovery 20%, fasting 15%, weekly 10%
 *   → if fasting disabled: redistribute 15% → workout +9%, recovery +6%
 * Game Readiness Score:         sleep 30%, training load 25%, recovery 25%, nutrition 20%
 */

import type { EngineMode } from "@/lib/engineConfig";

export type StatusLabel = "strong" | "moderate" | "needs_support";
export type RecommendationType = "advance" | "maintain" | "reduce";

export type ScoreFactor =
  | "fasting"
  | "sleep"
  | "nutrition"
  | "weekly_completion"
  | "workout"
  | "recovery"
  | "training_load";

export interface FactorScore {
  factor: ScoreFactor;
  label: string;
  normalized: number; // 0-100
  weight: number;
  weighted: number;
}

export interface EngineResult {
  engine: EngineMode;
  score: number;
  status: StatusLabel;
  recommendation: RecommendationType;
  lowestFactor: FactorScore;
  factors: FactorScore[];
  streakDays: number;
  weeklyCompletionPct: number;
}

export interface DailyInputs {
  sleepHours: number | null;
  sleepQuality: number | null; // 1-5
  nutritionOnTrack: boolean | null;
  recoveryCompleted: boolean | null;
  fastCompleted: boolean;
  workoutCompleted: boolean;
}

// ─── Normalization helpers ──────────────────────────────

function normSleep(hours: number | null): number {
  if (hours === null) return 50;
  if (hours >= 7 && hours <= 9) return 100;
  if (hours >= 6) return 70;
  if (hours >= 5) return 40;
  return 20;
}

function normBool(val: boolean | null): number {
  if (val === null) return 50;
  return val ? 100 : 20;
}

function avg(values: number[]): number {
  if (values.length === 0) return 50;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// ─── Streak & weekly ────────────────────────────────────

function calculateStreak(days: DailyInputs[], key: "fastCompleted" | "workoutCompleted"): number {
  let streak = 0;
  for (const d of days) {
    if (d[key]) streak++;
    else break;
  }
  return streak;
}

function weeklyPct(days: DailyInputs[], key: "fastCompleted" | "workoutCompleted"): number {
  const last7 = days.slice(0, 7);
  if (last7.length === 0) return 0;
  return (last7.filter((d) => d[key]).length / 7) * 100;
}

// ─── Status & Recommendation ────────────────────────────

function getStatus(score: number): StatusLabel {
  if (score >= 80) return "strong";
  if (score >= 60) return "moderate";
  return "needs_support";
}

function getRecommendation(status: StatusLabel): RecommendationType {
  if (status === "strong") return "maintain";
  if (status === "moderate") return "reduce"; // "adjust" maps to reduce
  return "reduce";
}

// ─── Factor helpers ─────────────────────────────────────

const FACTOR_LABELS: Record<ScoreFactor, string> = {
  fasting: "Fasting Adherence",
  sleep: "Sleep",
  nutrition: "Nutrition",
  weekly_completion: "Weekly Completion",
  workout: "Workout Completion",
  recovery: "Recovery Balance",
  training_load: "Training Load Balance",
};

function buildFactor(factor: ScoreFactor, normalized: number, weight: number): FactorScore {
  return {
    factor,
    label: FACTOR_LABELS[factor],
    normalized: Math.round(normalized),
    weight,
    weighted: Math.round(normalized * weight),
  };
}

// ─── Engine Computations ────────────────────────────────

function computeMetabolic(days: DailyInputs[]): EngineResult {
  const last7 = days.slice(0, 7);

  const fastingNorm = avg(last7.map((d) => normBool(d.fastCompleted ? true : null)));
  const sleepNorm = avg(last7.map((d) => normSleep(d.sleepHours)));
  const nutritionNorm = avg(last7.map((d) => normBool(d.nutritionOnTrack)));
  const wkPct = weeklyPct(days, "fastCompleted");
  const completionNorm = Math.min(wkPct, 100);

  const factors: FactorScore[] = [
    buildFactor("fasting", fastingNorm, 0.40),
    buildFactor("sleep", sleepNorm, 0.20),
    buildFactor("nutrition", nutritionNorm, 0.20),
    buildFactor("weekly_completion", completionNorm, 0.20),
  ];

  const score = Math.min(100, Math.max(0, Math.round(factors.reduce((s, f) => s + f.weighted, 0))));
  const status = getStatus(score);
  const lowestFactor = [...factors].sort((a, b) => a.normalized - b.normalized)[0];

  return {
    engine: "metabolic",
    score,
    status,
    recommendation: getRecommendation(status),
    lowestFactor,
    factors,
    streakDays: calculateStreak(days, "fastCompleted"),
    weeklyCompletionPct: Math.round(wkPct),
  };
}

function computePerformance(days: DailyInputs[], fastingEnabled: boolean): EngineResult {
  const last7 = days.slice(0, 7);

  const workoutNorm = avg(last7.map((d) => normBool(d.workoutCompleted ? true : null)));
  const sleepNorm = avg(last7.map((d) => normSleep(d.sleepHours)));
  const recoveryNorm = avg(last7.map((d) => normBool(d.recoveryCompleted)));
  const fastingNorm = avg(last7.map((d) => normBool(d.fastCompleted ? true : null)));
  const wkPct = weeklyPct(days, "workoutCompleted");
  const completionNorm = Math.min(wkPct, 100);

  let wWorkout = 0.35, wSleep = 0.20, wRecovery = 0.20, wFasting = 0.15, wWeekly = 0.10;

  if (!fastingEnabled) {
    // Redistribute 15% proportionally: workout gets 9%, recovery gets 6%
    wWorkout += 0.09;
    wRecovery += 0.06;
    wFasting = 0;
  }

  const factors: FactorScore[] = [
    buildFactor("workout", workoutNorm, wWorkout),
    buildFactor("sleep", sleepNorm, wSleep),
    buildFactor("recovery", recoveryNorm, wRecovery),
    ...(fastingEnabled ? [buildFactor("fasting", fastingNorm, wFasting)] : []),
    buildFactor("weekly_completion", completionNorm, wWeekly),
  ];

  const score = Math.min(100, Math.max(0, Math.round(factors.reduce((s, f) => s + f.weighted, 0))));
  const status = getStatus(score);
  const lowestFactor = [...factors].sort((a, b) => a.normalized - b.normalized)[0];

  return {
    engine: "performance",
    score,
    status,
    recommendation: getRecommendation(status),
    lowestFactor,
    factors,
    streakDays: calculateStreak(days, "workoutCompleted"),
    weeklyCompletionPct: Math.round(wkPct),
  };
}

function computeAthletic(days: DailyInputs[]): EngineResult {
  const last7 = days.slice(0, 7);

  const sleepNorm = avg(last7.map((d) => normSleep(d.sleepHours)));
  const trainingNorm = avg(last7.map((d) => normBool(d.workoutCompleted ? true : null)));
  const recoveryNorm = avg(last7.map((d) => normBool(d.recoveryCompleted)));
  const nutritionNorm = avg(last7.map((d) => normBool(d.nutritionOnTrack)));

  const factors: FactorScore[] = [
    buildFactor("sleep", sleepNorm, 0.30),
    buildFactor("training_load", trainingNorm, 0.25),
    buildFactor("recovery", recoveryNorm, 0.25),
    buildFactor("nutrition", nutritionNorm, 0.20),
  ];

  const score = Math.min(100, Math.max(0, Math.round(factors.reduce((s, f) => s + f.weighted, 0))));
  const status = getStatus(score);
  const lowestFactor = [...factors].sort((a, b) => a.normalized - b.normalized)[0];

  return {
    engine: "athletic",
    score,
    status,
    recommendation: getRecommendation(status),
    lowestFactor,
    factors,
    streakDays: calculateStreak(days, "workoutCompleted"),
    weeklyCompletionPct: Math.round(weeklyPct(days, "workoutCompleted")),
  };
}

// ─── Public API ─────────────────────────────────────────

export function computeEngineScore(
  engine: EngineMode,
  days: DailyInputs[],
  fastingEnabled = true,
): EngineResult {
  switch (engine) {
    case "metabolic":
      return computeMetabolic(days);
    case "performance":
      return computePerformance(days, fastingEnabled);
    case "athletic":
      return computeAthletic(days);
    default:
      return computePerformance(days, fastingEnabled);
  }
}

export const ENGINE_SCORE_LABELS: Record<EngineMode, string> = {
  metabolic: "Metabolic Stability Index",
  performance: "Performance Readiness Score",
  athletic: "Recovery & Game Readiness Score",
};

export const STATUS_DISPLAY: Record<StatusLabel, { label: string; color: string }> = {
  strong: { label: "Strong", color: "emerald" },
  moderate: { label: "Moderate", color: "amber" },
  needs_support: { label: "Needs Support", color: "red" },
};

export const RECOMMENDATION_MESSAGES: Record<
  RecommendationType,
  Record<StatusLabel, { title: string; description: string }>
> = {
  advance: {
    strong: { title: "Ready to Advance", description: "Your consistency supports progression." },
    moderate: { title: "Building Momentum", description: "Keep pushing toward advancement." },
    needs_support: { title: "Focus First", description: "Shore up fundamentals before advancing." },
  },
  maintain: {
    strong: {
      title: "Maintain Course",
      description: "Consistency is your strength. Keep this rhythm going.",
    },
    moderate: { title: "Hold Steady", description: "Stay consistent to build toward Strong status." },
    needs_support: { title: "Stabilize", description: "Focus on daily habits before progressing." },
  },
  reduce: {
    strong: { title: "Ease Back", description: "Pull back slightly to avoid overtraining." },
    moderate: {
      title: "Adjust Approach",
      description: "Focus on your lowest scoring area to improve readiness.",
    },
    needs_support: {
      title: "Recovery Focus",
      description: "Reduce training intensity. Prioritize sleep and recovery.",
    },
  },
};

export const CORRECTIVE_ACTIONS: Record<ScoreFactor, string> = {
  fasting: "Try to complete your fasting window consistently.",
  sleep: "Aim for 7–9 hours of quality sleep tonight.",
  nutrition: "Focus on balanced meals within your eating window.",
  weekly_completion: "Increase your daily check-in completions this week.",
  workout: "Complete your scheduled workouts to improve this score.",
  recovery: "Add a recovery session or active rest day.",
  training_load: "Balance training intensity with adequate rest days.",
};
