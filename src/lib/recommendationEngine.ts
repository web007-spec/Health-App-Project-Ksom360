/**
 * Recommendation Engine Scoring Logic
 *
 * Three engines with weighted scoring:
 * 1. Metabolic Stability Index  – prioritizes fasting consistency + nutrition
 * 2. Performance Readiness Score – prioritizes sleep + recovery
 * 3. Game Readiness Score        – balanced across all inputs
 *
 * Each produces a 0–100 score → status label → recommendation.
 */

export type EngineType = "metabolic_stability" | "performance_readiness" | "game_readiness";
export type StatusLabel = "strong" | "moderate" | "needs_support";
export type Recommendation = "advance" | "maintain" | "reduce";

export interface EngineResult {
  engine: EngineType;
  score: number;
  status: StatusLabel;
  recommendation: Recommendation;
  streakDays: number;
  weeklyCompletionPct: number;
}

export interface CheckinDay {
  sleepHours: number | null;
  sleepQuality: number | null; // 1-5
  nutritionOnTrack: boolean | null;
  recoveryCompleted: boolean | null;
  fastCompleted: boolean;
}

interface Weights {
  streak: number;
  weeklyCompletion: number;
  sleepHours: number;
  sleepQuality: number;
  nutrition: number;
  recovery: number;
}

const ENGINE_WEIGHTS: Record<EngineType, Weights> = {
  metabolic_stability: {
    streak: 0.25,
    weeklyCompletion: 0.25,
    sleepHours: 0.10,
    sleepQuality: 0.05,
    nutrition: 0.25,
    recovery: 0.10,
  },
  performance_readiness: {
    streak: 0.15,
    weeklyCompletion: 0.15,
    sleepHours: 0.20,
    sleepQuality: 0.15,
    nutrition: 0.10,
    recovery: 0.25,
  },
  game_readiness: {
    streak: 0.20,
    weeklyCompletion: 0.15,
    sleepHours: 0.15,
    sleepQuality: 0.15,
    nutrition: 0.15,
    recovery: 0.20,
  },
};

// Thresholds
const STRONG_THRESHOLD = 75;
const MODERATE_THRESHOLD = 45;

function getStatus(score: number): StatusLabel {
  if (score >= STRONG_THRESHOLD) return "strong";
  if (score >= MODERATE_THRESHOLD) return "moderate";
  return "needs_support";
}

function getRecommendation(score: number, streakDays: number): Recommendation {
  if (score >= STRONG_THRESHOLD && streakDays >= 10) return "advance";
  if (score >= MODERATE_THRESHOLD) return "maintain";
  return "reduce";
}

/** Calculate consecutive completion days (streak) from recent data, newest first */
function calculateStreak(days: CheckinDay[]): number {
  let streak = 0;
  for (const day of days) {
    if (day.fastCompleted) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/** Weekly completion as percentage of last 7 days */
function weeklyCompletion(days: CheckinDay[]): number {
  const last7 = days.slice(0, 7);
  if (last7.length === 0) return 0;
  const completed = last7.filter((d) => d.fastCompleted).length;
  return (completed / 7) * 100;
}

/** Normalize a value to 0-100 */
function normSleep(hours: number | null): number {
  if (hours === null) return 50; // neutral if not logged
  if (hours >= 7 && hours <= 9) return 100;
  if (hours >= 6) return 70;
  if (hours >= 5) return 40;
  return 20;
}

function normQuality(q: number | null): number {
  if (q === null) return 50;
  return (q / 5) * 100;
}

function normBool(val: boolean | null): number {
  if (val === null) return 50;
  return val ? 100 : 20;
}

function normStreak(streak: number): number {
  return Math.min(streak / 14, 1) * 100; // 14-day streak = 100
}

function normCompletion(pct: number): number {
  return Math.min(pct, 100);
}

export function computeEngine(engine: EngineType, recentDays: CheckinDay[]): EngineResult {
  const w = ENGINE_WEIGHTS[engine];
  const streak = calculateStreak(recentDays);
  const wkCompletion = weeklyCompletion(recentDays);

  // Average recent check-in values (last 7 days)
  const last7 = recentDays.slice(0, 7);
  const avgSleepHours = last7.length > 0
    ? last7.reduce((s, d) => s + normSleep(d.sleepHours), 0) / last7.length
    : 50;
  const avgSleepQuality = last7.length > 0
    ? last7.reduce((s, d) => s + normQuality(d.sleepQuality), 0) / last7.length
    : 50;
  const avgNutrition = last7.length > 0
    ? last7.reduce((s, d) => s + normBool(d.nutritionOnTrack), 0) / last7.length
    : 50;
  const avgRecovery = last7.length > 0
    ? last7.reduce((s, d) => s + normBool(d.recoveryCompleted), 0) / last7.length
    : 50;

  const score = Math.round(
    w.streak * normStreak(streak) +
    w.weeklyCompletion * normCompletion(wkCompletion) +
    w.sleepHours * avgSleepHours +
    w.sleepQuality * avgSleepQuality +
    w.nutrition * avgNutrition +
    w.recovery * avgRecovery
  );

  return {
    engine,
    score: Math.min(100, Math.max(0, score)),
    status: getStatus(score),
    recommendation: getRecommendation(score, streak),
    streakDays: streak,
    weeklyCompletionPct: Math.round(wkCompletion),
  };
}

export function computeAllEngines(recentDays: CheckinDay[]): EngineResult[] {
  return [
    computeEngine("metabolic_stability", recentDays),
    computeEngine("performance_readiness", recentDays),
    computeEngine("game_readiness", recentDays),
  ];
}

export const ENGINE_LABELS: Record<EngineType, string> = {
  metabolic_stability: "Metabolic Stability",
  performance_readiness: "Performance Readiness",
  game_readiness: "Game Readiness",
};

export const STATUS_LABELS: Record<StatusLabel, string> = {
  strong: "Strong",
  moderate: "Moderate",
  needs_support: "Needs Support",
};

export const RECOMMENDATION_LABELS: Record<Recommendation, { label: string; description: string }> = {
  advance: {
    label: "Recommended",
    description: "You are ready to advance based on recent stability.",
  },
  maintain: {
    label: "Maintain",
    description: "Remain at this level to reinforce metabolic rhythm.",
  },
  reduce: {
    label: "Reduce",
    description: "Step back temporarily to support recovery.",
  },
};
