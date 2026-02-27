/**
 * Adaptive Recommendation Escalation — Engine-Aware Rules
 *
 * Produces 3 outputs per client per day:
 *  1. Today Recommendation (action-oriented, based on lowest_factor + status)
 *  2. This Week Recommendation (based on trend + weekly completion)
 *  3. Plan Suggestion (optional, gated by safety rules)
 */

import type { EngineMode } from "@/lib/engineConfig";
import type { ScoreFactor, StatusLabel } from "@/lib/recommendationEngine";

// ─── Types ──────────────────────────────────────────────

export type TrendDirection = "up" | "flat" | "down";

export type PlanSuggestionType =
  | "maintain"
  | "advance"
  | "hold"
  | "deload"
  | "shift";

export interface RecommendationInput {
  engineMode: EngineMode;
  currentLevel: number;
  scoreTotal: number;
  scoreStatus: StatusLabel;
  lowestFactor: ScoreFactor;
  streakDays: number;
  weeklyCompletionPct: number;
  last7DayAvgScore: number;
  prior7DayAvgScore: number;
  fastingEnabled: boolean;
  upcomingGameOrPractice: boolean;
  needsSupportDaysLast14: number;
  daysInLevel: number;
}

export interface RecommendationOutput {
  todayText: string;
  weekText: string;
  planSuggestion: {
    type: PlanSuggestionType;
    text: string;
    coachOverrideRequired: boolean;
  } | null;
}

// ─── Trend calculation ──────────────────────────────────

export function getTrendDirection(
  last7Avg: number,
  prior7Avg: number,
): TrendDirection {
  const diff = last7Avg - prior7Avg;
  if (diff >= 5) return "up";
  if (diff <= -5) return "down";
  return "flat";
}

// ─── Today templates by factor + status ─────────────────

// Status-level templates (used when no factor-specific override exists)
const TODAY_STATUS_TEMPLATES: Record<EngineMode, Record<StatusLabel, string[]>> = {
  metabolic: {
    strong: [
      "Metabolic regulation is stable. Maintain your current structure.",
      "Stability is reinforced through consistency. Continue as planned.",
    ],
    moderate: [
      "Small adjustments today will improve metabolic stability.",
      "Refine your lowest input to strengthen regulation.",
    ],
    needs_support: [
      "Stability requires correction. Focus on restoring structure today.",
      "Reestablish consistency before increasing intensity.",
    ],
  },
  performance: {
    strong: [
      "Performance readiness is high. Execute fully.",
      "Training capacity is strong. Push with control.",
    ],
    moderate: [
      "Refine recovery and execution to increase output.",
      "Tighten structure to maximize today's session.",
    ],
    needs_support: [
      "Recovery and structure need attention before intensity.",
      "Stabilize fundamentals before increasing workload.",
    ],
  },
  athletic: {
    strong: [
      "Game readiness is strong. Train with confidence.",
      "Recovery supports full performance today.",
    ],
    moderate: [
      "Sharpen recovery habits to boost readiness.",
      "Focus on sleep and hydration.",
    ],
    needs_support: [
      "Recovery must improve before high intensity.",
      "Protect your body first, then perform.",
    ],
  },
};

// Factor-specific overrides (take priority over status templates)
const TODAY_FACTOR_OVERRIDES: Record<EngineMode, Partial<Record<ScoreFactor, string>>> = {
  metabolic: {
    sleep: "Sleep quality directly affects metabolic response. Prioritize 7+ hours tonight.",
    fasting: "Maintain your fasting window precisely to reinforce stability.",
    nutrition: "Prioritize whole foods and reduce excess intake within your window.",
    weekly_completion: "Consistency compounds. Complete today's full protocol.",
  },
  performance: {
    workout: "Complete your scheduled session to reinforce adaptation.",
    sleep: "Recovery quality determines performance output.",
    recovery: "Add light mobility or lower load if fatigue is elevated.",
    fasting: "Nutritional timing should support training energy.",
    weekly_completion: "Full weekly execution accelerates results.",
  },
  athletic: {
    sleep: "Sleep fuels speed and reaction time.",
    training_load: "Finish today's reps with focus.",
    recovery: "Stretch, hydrate, and protect your body.",
    nutrition: "Fuel properly to support power and endurance.",
    weekly_completion: "Consistency builds competitive advantage.",
  },
};

// ─── Week templates by trend + completion ───────────────

const WEEK_TEMPLATES: Record<EngineMode, Record<TrendDirection, string>> = {
  metabolic: {
    up: "Your metabolic trend is improving. Maintain current plan.",
    flat: "Progress is steady. Tighten execution for greater gains.",
    down: "Recent trends show instability. Reduce variability and reinforce sleep.",
  },
  performance: {
    up: "Performance trajectory is improving. Maintain volume.",
    flat: "Consistency is present. Improve recovery quality.",
    down: "Reduce load slightly and prioritize recovery.",
  },
  athletic: {
    up: "Preparation is trending upward. Stay disciplined.",
    flat: "Build sharper recovery habits.",
    down: "Prioritize sleep and recovery before adding intensity.",
  },
};

function getWeekText(
  engine: EngineMode,
  trend: TrendDirection,
): string {
  return WEEK_TEMPLATES[engine][trend];
}

// ─── Plan suggestion gating ─────────────────────────────

function evaluatePlanSuggestion(
  input: RecommendationInput,
): RecommendationOutput["planSuggestion"] {
  const {
    engineMode,
    currentLevel,
    scoreTotal,
    scoreStatus,
    streakDays,
    weeklyCompletionPct,
    last7DayAvgScore,
    needsSupportDaysLast14,
    daysInLevel,
    upcomingGameOrPractice,
  } = input;

  const trend = getTrendDirection(last7DayAvgScore, input.prior7DayAvgScore);

  // ── Advance: eligible to level up
  if (
    currentLevel < 7 &&
    daysInLevel >= 14 &&
    last7DayAvgScore >= 80 &&
    weeklyCompletionPct >= 85 &&
    streakDays >= 10 &&
    needsSupportDaysLast14 <= 2
  ) {
    return {
      type: "advance",
      text: `Client meets all criteria for Level ${currentLevel + 1}. Consistent scores and strong adherence support advancement.`,
      coachOverrideRequired: true,
    };
  }

  // ── Deload: sustained poor performance
  if (
    needsSupportDaysLast14 >= 5 &&
    trend === "down" &&
    last7DayAvgScore < 55
  ) {
    const engineDeload: Record<EngineMode, string> = {
      metabolic: "Consider reducing fasting window duration or switching to a lighter protocol.",
      performance: "Recommend a recovery week with reduced training volume.",
      athletic: "Reduce training intensity and prioritize recovery around upcoming events.",
    };
    return {
      type: "deload",
      text: engineDeload[engineMode],
      coachOverrideRequired: true,
    };
  }

  // ── Hold: borderline but not ready to advance
  if (
    currentLevel < 7 &&
    daysInLevel >= 14 &&
    last7DayAvgScore >= 65 &&
    last7DayAvgScore < 80
  ) {
    return {
      type: "hold",
      text: "Scores are improving but haven't reached advancement threshold. Continue current programming.",
      coachOverrideRequired: false,
    };
  }

  // ── Shift: engine-specific protocol adjustments
  if (engineMode === "metabolic" && scoreStatus === "moderate" && trend === "down") {
    return {
      type: "shift",
      text: "Consider adjusting fasting window duration to match client's current tolerance.",
      coachOverrideRequired: true,
    };
  }

  if (engineMode === "performance" && scoreStatus === "moderate" && trend === "down") {
    return {
      type: "shift",
      text: "Consider adjusting training volume or toggling fasting to improve readiness.",
      coachOverrideRequired: true,
    };
  }

  if (engineMode === "athletic" && upcomingGameOrPractice && scoreStatus !== "strong") {
    return {
      type: "shift",
      text: "Game/practice upcoming with sub-optimal readiness. Adjust load and recovery emphasis.",
      coachOverrideRequired: true,
    };
  }

  // ── Maintain: default
  if (scoreStatus === "strong" && weeklyCompletionPct >= 80) {
    return {
      type: "maintain",
      text: "Current programming is producing strong results. No changes recommended.",
      coachOverrideRequired: false,
    };
  }

  return null;
}

// ─── Main generation function ───────────────────────────

export function generateRecommendation(
  input: RecommendationInput,
): RecommendationOutput {
  const trend = getTrendDirection(
    input.last7DayAvgScore,
    input.prior7DayAvgScore,
  );

  // Today text: factor override takes priority, then status template
  const factorOverride = TODAY_FACTOR_OVERRIDES[input.engineMode][input.lowestFactor];
  let todayText: string;
  if (factorOverride) {
    todayText = factorOverride;
  } else {
    const statusOptions = TODAY_STATUS_TEMPLATES[input.engineMode][input.scoreStatus];
    todayText = statusOptions[Math.floor(Math.random() * statusOptions.length)];
  }

  // Week text
  const weekText = getWeekText(input.engineMode, trend);

  // Plan suggestion (gated)
  const planSuggestion = evaluatePlanSuggestion(input);

  return { todayText, weekText, planSuggestion };
}

// ─── Plan suggestion display labels ─────────────────────

export const PLAN_SUGGESTION_LABELS: Record<
  PlanSuggestionType,
  { label: string; color: string }
> = {
  maintain: { label: "Maintain", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  advance: { label: "Advance", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  hold: { label: "Hold", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  deload: { label: "Deload", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  shift: { label: "Shift", color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
};
