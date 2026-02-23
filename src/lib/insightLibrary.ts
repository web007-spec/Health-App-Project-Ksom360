/**
 * Insight Intelligence Library
 *
 * 90+ insights tagged by engine, level band, factor, and status.
 * Tone rules:
 *   Metabolic: calm, clinical, stable, disciplined
 *   Performance: confident, performance-driven, forward momentum
 *   Athletic: energetic, supportive, development + game-ready
 */

import type { EngineMode } from "@/lib/engineConfig";
import type { ScoreFactor, StatusLabel } from "@/lib/recommendationEngine";

export type LevelBand = "1-3" | "4-6" | "7" | "any";

export interface InsightEntry {
  id: string;
  engine: EngineMode;
  levelBand: LevelBand;
  factor: ScoreFactor | "any";
  status: StatusLabel | "any";
  message: string;
  action?: string;
}

let _id = 0;
const i = (
  engine: EngineMode,
  levelBand: LevelBand,
  factor: ScoreFactor | "any",
  status: StatusLabel | "any",
  message: string,
  action?: string,
): InsightEntry => ({
  id: `ins_${++_id}`,
  engine,
  levelBand,
  factor,
  status,
  message,
  action,
});

export const INSIGHT_LIBRARY: InsightEntry[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // METABOLIC ENGINE (30 insights)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Fasting
  i("metabolic", "1-3", "fasting", "moderate", "Metabolic stability improves when fasting windows remain consistent. Irregular timing disrupts regulation.", "Today: Maintain your planned fasting window."),
  i("metabolic", "1-3", "fasting", "needs_support", "Inconsistent fasting reduces metabolic signaling efficiency.", "Today: Complete your full fasting window."),
  i("metabolic", "4-6", "fasting", "strong", "Consistent fasting patterns are reinforcing metabolic adaptation.", "Continue current fasting rhythm."),
  i("metabolic", "4-6", "fasting", "moderate", "Small fasting inconsistencies can compound over time.", "Prioritize window precision today."),
  i("metabolic", "7", "fasting", "any", "Mastery is built on precision. Your fasting consistency sets the metabolic baseline."),

  // Sleep
  i("metabolic", "1-3", "sleep", "needs_support", "Reduced sleep disrupts insulin sensitivity and recovery.", "Tonight: Target at least 7 hours."),
  i("metabolic", "1-3", "sleep", "moderate", "Sleep stability strengthens hormonal regulation.", "Protect your sleep schedule."),
  i("metabolic", "4-6", "sleep", "strong", "Consistent sleep reinforces metabolic balance."),
  i("metabolic", "4-6", "sleep", "needs_support", "Sleep debt undermines metabolic stability.", "Prioritize early wind-down."),
  i("metabolic", "7", "sleep", "any", "Optimized sleep amplifies metabolic efficiency."),

  // Nutrition
  i("metabolic", "1-3", "nutrition", "needs_support", "Frequent overeating interrupts metabolic signaling.", "Today: Eat intentionally within your window."),
  i("metabolic", "1-3", "nutrition", "moderate", "Meal composition influences insulin response.", "Prioritize protein and whole foods."),
  i("metabolic", "4-6", "nutrition", "strong", "Nutritional discipline supports long-term regulation."),
  i("metabolic", "4-6", "nutrition", "moderate", "Consistency in food quality protects metabolic gains.", "Limit processed intake."),
  i("metabolic", "7", "nutrition", "any", "Refinement replaces restriction at mastery level."),

  // Completion
  i("metabolic", "1-3", "weekly_completion", "needs_support", "Missed days disrupt metabolic momentum.", "Recommit today."),
  i("metabolic", "1-3", "weekly_completion", "moderate", "Consistency compounds faster than intensity.", "Complete today's plan fully."),
  i("metabolic", "4-6", "weekly_completion", "strong", "Your discipline is reinforcing metabolic stability."),
  i("metabolic", "4-6", "weekly_completion", "needs_support", "Consistency gaps slow adaptation.", "Complete all check-ins today."),
  i("metabolic", "7", "weekly_completion", "any", "Mastery is sustained through quiet consistency."),

  // General
  i("metabolic", "1-3", "any", "strong", "Early consistency builds metabolic confidence."),
  i("metabolic", "1-3", "any", "moderate", "Small corrections today prevent regression tomorrow.", "Focus on your lowest metric."),
  i("metabolic", "1-3", "any", "needs_support", "Metabolic stability requires daily regulation.", "Stabilize one behavior today."),
  i("metabolic", "4-6", "any", "strong", "Your stability curve is improving steadily."),
  i("metabolic", "4-6", "any", "moderate", "Optimization requires refinement.", "Improve your weakest factor."),
  i("metabolic", "4-6", "any", "needs_support", "Temporary regression can be corrected quickly.", "Reestablish structure."),
  i("metabolic", "7", "any", "strong", "Metabolic mastery is reflected in steady metrics."),
  i("metabolic", "7", "any", "moderate", "Even advanced systems require recalibration.", "Refine your lowest input."),
  i("metabolic", "7", "any", "needs_support", "Mastery demands recalibration, not reaction.", "Stabilize sleep and structure first."),

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PERFORMANCE ENGINE (30 insights)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Workout
  i("performance", "1-3", "workout", "needs_support", "Training consistency drives performance adaptation.", "Complete today's workout fully."),
  i("performance", "1-3", "workout", "moderate", "You're building rhythm. Stay consistent.", "Finish strong today."),
  i("performance", "4-6", "workout", "strong", "Training execution is supporting measurable progress."),
  i("performance", "4-6", "workout", "needs_support", "Missed sessions reduce adaptation efficiency.", "Recommit to scheduled volume."),
  i("performance", "7", "workout", "any", "Mastery is sustained through disciplined execution."),

  // Sleep
  i("performance", "1-3", "sleep", "needs_support", "Performance output is limited by recovery quality.", "Prioritize 7+ hours tonight."),
  i("performance", "1-3", "sleep", "moderate", "Sleep stability increases training response.", "Protect tonight's recovery."),
  i("performance", "4-6", "sleep", "strong", "Recovery patterns are supporting strength gains."),
  i("performance", "4-6", "sleep", "needs_support", "Recovery inconsistency can stall progress.", "Reinforce sleep timing."),
  i("performance", "7", "sleep", "any", "Elite output requires elite recovery habits."),

  // Recovery
  i("performance", "1-3", "recovery", "needs_support", "Recovery gaps increase fatigue accumulation.", "Add light mobility or walk today."),
  i("performance", "1-3", "recovery", "moderate", "Active recovery sustains training intensity.", "Stay moving."),
  i("performance", "4-6", "recovery", "strong", "Balanced recovery supports higher workload capacity."),
  i("performance", "4-6", "recovery", "needs_support", "Accumulated fatigue reduces performance output.", "Lower intensity if needed."),
  i("performance", "7", "recovery", "any", "Optimization replaces overtraining at this level."),

  // Fasting
  i("performance", "1-3", "fasting", "moderate", "Fasting discipline supports metabolic efficiency.", "Maintain your planned window."),
  i("performance", "1-3", "fasting", "needs_support", "Nutritional timing affects training energy.", "Stabilize your eating window."),
  i("performance", "4-6", "fasting", "strong", "Nutritional structure is aligned with performance."),
  i("performance", "4-6", "fasting", "moderate", "Energy consistency improves output.", "Refine meal timing."),
  i("performance", "7", "fasting", "any", "Fueling precision enhances advanced adaptation."),

  // Completion
  i("performance", "1-3", "weekly_completion", "needs_support", "Progress depends on full weekly execution.", "Complete remaining sessions."),
  i("performance", "1-3", "weekly_completion", "moderate", "You're close to full execution.", "Finish strong this week."),
  i("performance", "4-6", "weekly_completion", "strong", "Consistency is translating into measurable strength."),
  i("performance", "4-6", "weekly_completion", "needs_support", "Partial completion slows progression.", "Close the gap."),
  i("performance", "7", "weekly_completion", "any", "Elite consistency compounds results."),

  // General
  i("performance", "1-3", "any", "strong", "You are building performance capacity."),
  i("performance", "1-3", "any", "moderate", "Small refinements produce noticeable gains.", "Improve your weakest metric."),
  i("performance", "1-3", "any", "needs_support", "Stability first. Intensity second.", "Reinforce structure."),
  i("performance", "4-6", "any", "strong", "Your readiness trend is upward."),
  i("performance", "4-6", "any", "moderate", "Focus sharpens outcomes.", "Target your lowest score."),
  i("performance", "4-6", "any", "needs_support", "Correct the weakest variable.", "Stabilize before increasing load."),
  i("performance", "7", "any", "strong", "Performance mastery is visible in the data."),
  i("performance", "7", "any", "moderate", "Optimization requires precise adjustments.", "Refine the weakest input."),
  i("performance", "7", "any", "needs_support", "Advanced progress demands recalibration.", "Correct before increasing intensity."),

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ATHLETIC ENGINE (30 insights)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Sleep
  i("athletic", "1-3", "sleep", "needs_support", "Sleep is your secret performance weapon.", "Aim for 8+ hours tonight."),
  i("athletic", "1-3", "sleep", "moderate", "Better sleep equals sharper reactions.", "Protect your bedtime."),
  i("athletic", "4-6", "sleep", "strong", "Recovery habits are fueling your development."),
  i("athletic", "4-6", "sleep", "needs_support", "Fatigue slows growth and reaction time.", "Reset your sleep routine."),
  i("athletic", "7", "sleep", "any", "Elite athletes protect their recovery."),

  // Training Load
  i("athletic", "1-3", "training_load", "needs_support", "Consistent reps build long-term skill.", "Complete today's full session."),
  i("athletic", "1-3", "training_load", "moderate", "You're building strong fundamentals.", "Stay consistent."),
  i("athletic", "4-6", "training_load", "strong", "Your workload supports real progress."),
  i("athletic", "4-6", "training_load", "needs_support", "Missed reps slow skill development.", "Finish what you start."),
  i("athletic", "7", "training_load", "any", "High-level athletes train with intention."),

  // Recovery
  i("athletic", "1-3", "recovery", "needs_support", "Stretching and hydration protect your body.", "Add recovery work today."),
  i("athletic", "1-3", "recovery", "moderate", "Recovery keeps you game-ready.", "Stay consistent with mobility."),
  i("athletic", "4-6", "recovery", "strong", "Balanced recovery supports stronger performance."),
  i("athletic", "4-6", "recovery", "needs_support", "Fatigue increases injury risk.", "Slow down and recover properly."),
  i("athletic", "7", "recovery", "any", "Recovery separates good from great."),

  // Nutrition
  i("athletic", "1-3", "nutrition", "needs_support", "Fueling affects speed and focus.", "Eat balanced meals today."),
  i("athletic", "1-3", "nutrition", "moderate", "Strong fueling builds stronger muscles.", "Prioritize protein."),
  i("athletic", "4-6", "nutrition", "strong", "Your nutrition supports recovery and power."),
  i("athletic", "4-6", "nutrition", "needs_support", "Low-quality fuel limits growth.", "Improve meal quality."),
  i("athletic", "7", "nutrition", "any", "Elite performance starts with smart fueling."),

  // Completion
  i("athletic", "1-3", "weekly_completion", "needs_support", "Consistency beats talent long-term.", "Complete all assigned work."),
  i("athletic", "1-3", "weekly_completion", "moderate", "Finish strong this week.", "Don't skip recovery."),
  i("athletic", "4-6", "weekly_completion", "strong", "Your discipline is showing."),
  i("athletic", "4-6", "weekly_completion", "needs_support", "Partial effort slows progress.", "Stay committed."),
  i("athletic", "7", "weekly_completion", "any", "Champions execute daily."),

  // General
  i("athletic", "1-3", "any", "strong", "You're building a strong foundation."),
  i("athletic", "1-3", "any", "moderate", "Small improvements add up fast.", "Focus on your weakest area."),
  i("athletic", "1-3", "any", "needs_support", "Stability first. Growth follows.", "Lock in the basics."),
  i("athletic", "4-6", "any", "strong", "You're progressing at the right pace."),
  i("athletic", "4-6", "any", "moderate", "Focus sharpens performance.", "Target your lowest metric."),
  i("athletic", "4-6", "any", "needs_support", "Fix weaknesses before adding intensity.", "Reinforce fundamentals."),
  i("athletic", "7", "any", "strong", "Game readiness is visible in your discipline."),
  i("athletic", "7", "any", "moderate", "Refinement builds competitive edge.", "Polish small details."),
  i("athletic", "7", "any", "needs_support", "Advanced athletes correct quickly.", "Address the weakest metric."),
];
