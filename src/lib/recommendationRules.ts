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

const TODAY_TEMPLATES: Record<
  EngineMode,
  Record<string, Record<StatusLabel, string>>
> = {
  metabolic: {
    fasting: {
      strong: "Maintain your fasting window — your metabolic rhythm is stable.",
      moderate: "Tighten your fasting window today to restore metabolic consistency.",
      needs_support: "Complete your full fasting window today to reset metabolic signaling.",
    },
    sleep: {
      strong: "Protect tonight's sleep to sustain metabolic balance.",
      moderate: "Prioritize sleep consistency — aim for 7+ hours tonight.",
      needs_support: "Sleep is your top priority today. Target at least 7 hours.",
    },
    nutrition: {
      strong: "Continue eating within structure — your nutrition is well-regulated.",
      moderate: "Focus on balanced meals within your eating window today.",
      needs_support: "Eat intentionally within your window — avoid unregulated intake.",
    },
    weekly_completion: {
      strong: "Keep your daily check-ins complete — consistency compounds.",
      moderate: "Complete today's full plan to maintain your weekly rhythm.",
      needs_support: "Recommit to today's plan — missed days disrupt momentum.",
    },
    recovery: {
      strong: "Recovery is supporting your metabolic stability. Maintain it.",
      moderate: "Add structured recovery time today.",
      needs_support: "Prioritize active rest today — your body needs recovery.",
    },
    workout: {
      strong: "Training is supporting your metabolic gains.",
      moderate: "Complete today's scheduled workout.",
      needs_support: "Even a light session maintains metabolic rhythm.",
    },
    training_load: {
      strong: "Training balance is supporting metabolic regulation.",
      moderate: "Balance training with recovery today.",
      needs_support: "Reduce training intensity and focus on regulation.",
    },
  },
  performance: {
    workout: {
      strong: "Execute today's session with full intensity — you're ready.",
      moderate: "Complete your scheduled workout to maintain training momentum.",
      needs_support: "Prioritize showing up — even a reduced session beats skipping.",
    },
    sleep: {
      strong: "Sleep is fueling your performance gains. Protect this rhythm.",
      moderate: "Improve tonight's sleep to boost tomorrow's output.",
      needs_support: "Recovery starts with sleep — make tonight non-negotiable.",
    },
    recovery: {
      strong: "Recovery balance is supporting your training capacity.",
      moderate: "Add mobility or light movement today for active recovery.",
      needs_support: "Pause intensity. Add a full recovery session today.",
    },
    fasting: {
      strong: "Fasting is supporting your performance toolkit.",
      moderate: "Stabilize your eating window around training today.",
      needs_support: "Adjust fasting timing to protect training energy.",
    },
    weekly_completion: {
      strong: "Strong weekly execution — keep the momentum.",
      moderate: "Close the gap on this week's remaining sessions.",
      needs_support: "Complete all remaining sessions to get back on track.",
    },
    nutrition: {
      strong: "Nutrition is fueling your training adaptations.",
      moderate: "Hit your protein target today.",
      needs_support: "Under-fueling limits performance. Prioritize nutrition today.",
    },
    training_load: {
      strong: "Training load is well-balanced for performance.",
      moderate: "Adjust volume to maintain quality of execution.",
      needs_support: "Reduce load to prevent overtraining.",
    },
  },
  athletic: {
    sleep: {
      strong: "Your sleep is game-ready. Keep this pattern.",
      moderate: "Better sleep means sharper reactions — aim for 8 hours tonight.",
      needs_support: "Sleep is your secret weapon. Make tonight a priority.",
    },
    training_load: {
      strong: "Training load is building real progress.",
      moderate: "Stay consistent with today's practice.",
      needs_support: "Complete today's full session — missed reps slow development.",
    },
    recovery: {
      strong: "Recovery discipline is powering your performance.",
      moderate: "Add stretching and hydration to today's routine.",
      needs_support: "Fatigue increases injury risk — slow down and recover properly.",
    },
    nutrition: {
      strong: "Your fueling supports recovery and power.",
      moderate: "Prioritize protein and hydration today.",
      needs_support: "Fuel quality impacts speed and focus. Eat balanced today.",
    },
    weekly_completion: {
      strong: "Your discipline is showing — keep it up!",
      moderate: "Finish strong this week — complete all assigned work.",
      needs_support: "Consistency beats talent. Complete all tasks today.",
    },
    fasting: {
      strong: "Nutritional timing supports athletic performance.",
      moderate: "Maintain regular eating patterns around training.",
      needs_support: "Focus on consistent nutrition for athletic development.",
    },
    workout: {
      strong: "Training execution is supporting game readiness.",
      moderate: "Complete today's workout fully.",
      needs_support: "Show up and execute — every session counts.",
    },
  },
};

// ─── Week templates by trend + completion ───────────────

function getWeekText(
  engine: EngineMode,
  trend: TrendDirection,
  weeklyPct: number,
): string {
  const highCompletion = weeklyPct >= 85;
  const lowCompletion = weeklyPct < 60;

  const templates: Record<EngineMode, Record<TrendDirection, string>> = {
    metabolic: {
      up: highCompletion
        ? "Your metabolic stability is trending upward. Maintain this rhythm."
        : "Trend is improving — increase daily completion to lock in gains.",
      flat: highCompletion
        ? "Steady regulation. Continue current habits to build further."
        : "Consistency needs reinforcement. Complete all daily targets this week.",
      down: lowCompletion
        ? "Metabolic regression detected. Reset with consistent daily structure."
        : "Trend is declining. Focus on your weakest factor to stabilize.",
    },
    performance: {
      up: highCompletion
        ? "Performance is trending up with strong execution. Keep pushing."
        : "Gains are building — close the gap on weekly completion.",
      flat: highCompletion
        ? "Holding steady. Precision in execution will drive the next breakthrough."
        : "Training consistency needs work. Complete all scheduled sessions.",
      down: lowCompletion
        ? "Output has dropped. Prioritize recovery and reduce volume if needed."
        : "Readiness is dipping. Address your lowest scoring factor this week.",
    },
    athletic: {
      up: highCompletion
        ? "You're trending toward peak game readiness. Stay locked in!"
        : "Progress is building — finish all assigned work to accelerate.",
      flat: highCompletion
        ? "Holding steady. Small refinements will sharpen your edge."
        : "Stay consistent with all assignments to maintain development.",
      down: lowCompletion
        ? "Development has slowed. Recommit to basics: sleep, eat, recover."
        : "Readiness is dipping. Focus on recovery and fundamentals.",
    },
  };

  return templates[engine][trend];
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

  // Today text
  const factorTemplates = TODAY_TEMPLATES[input.engineMode][input.lowestFactor];
  const todayText = factorTemplates
    ? factorTemplates[input.scoreStatus]
    : TODAY_TEMPLATES[input.engineMode].sleep[input.scoreStatus];

  // Week text
  const weekText = getWeekText(
    input.engineMode,
    trend,
    input.weeklyCompletionPct,
  );

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
