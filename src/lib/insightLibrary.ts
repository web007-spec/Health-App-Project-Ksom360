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
  i("athletic", "1-3", "sleep", "strong", "Great sleep! Your body recovers and grows stronger while you rest. Keep it up!", "Stick to your bedtime tonight."),
  i("athletic", "1-3", "sleep", "moderate", "Sleep is your competitive edge. Try to get to bed 30 minutes earlier tonight."),
  i("athletic", "1-3", "sleep", "needs_support", "Your sleep has been low. Game performance starts with last night's rest.", "Lights out by 10pm tonight."),
  i("athletic", "4-6", "sleep", "strong", "You're sleeping like a champion. This fuels everything — training, games, recovery."),
  i("athletic", "4-6", "sleep", "needs_support", "Low sleep is holding back your game readiness. Make tonight a priority.", "Set a phone curfew 1 hour before bed."),
  i("athletic", "7", "sleep", "any", "At your level, sleep optimization separates good athletes from great ones."),

  // Training load
  i("athletic", "1-3", "training_load", "strong", "Solid training! You're building the athletic base that makes game day easier.", "Give 100% effort at practice today."),
  i("athletic", "1-3", "training_load", "moderate", "Training consistency builds confidence. Show up strong today."),
  i("athletic", "1-3", "training_load", "needs_support", "Your training load has dropped. Even a light session keeps your body in rhythm.", "Complete at least a warm-up and skills session."),
  i("athletic", "4-6", "training_load", "strong", "Your training consistency is translating to game performance. Keep grinding!"),
  i("athletic", "4-6", "training_load", "moderate", "Balance your training load — too much or too little both hurt game readiness."),
  i("athletic", "4-6", "training_load", "needs_support", "Training gaps affect game day confidence. Get back to your routine."),
  i("athletic", "7", "training_load", "any", "Game-adaptive training is your edge. Your body knows the rhythm now."),

  // Recovery
  i("athletic", "1-3", "recovery", "strong", "Awesome recovery habits! Your body is thanking you with better performance."),
  i("athletic", "1-3", "recovery", "needs_support", "Recovery makes you faster and stronger. Don't skip it!", "Do 10 minutes of stretching after practice."),
  i("athletic", "4-6", "recovery", "strong", "Recovery discipline separates athletes who peak from those who plateau."),
  i("athletic", "4-6", "recovery", "needs_support", "Your recovery is lagging. Add mobility and active recovery before it impacts your game.", "Foam roll for 10 minutes today."),
  i("athletic", "7", "recovery", "any", "At mastery level, you understand recovery is performance. Keep investing."),

  // Nutrition
  i("athletic", "1-3", "nutrition", "strong", "Good fueling! Proper nutrition powers your training and game performance."),
  i("athletic", "1-3", "nutrition", "needs_support", "Your body is your equipment — fuel it right. Focus on protein and hydration today.", "Drink water with every meal today."),
  i("athletic", "4-6", "nutrition", "any", "Nutrition is fuel strategy for your sport. Eat to perform, not just to eat."),
  i("athletic", "7", "nutrition", "any", "Mastery fueling: you know what your body needs. Trust your routine."),

  // Weekly completion
  i("athletic", "any", "weekly_completion", "strong", "Full commitment this week! Consistency separates good athletes from great ones."),
  i("athletic", "any", "weekly_completion", "moderate", "Your weekly check-ins help track your readiness. Complete today's.", "Log your check-in before practice."),
  i("athletic", "any", "weekly_completion", "needs_support", "Missing check-ins means missing data. Your Game Readiness Score needs your input."),

  // General athletic
  i("athletic", "any", "any", "strong", "You're game ready! Keep this energy and discipline going."),
  i("athletic", "any", "any", "moderate", "Champions are built in the off-moments — recovery, sleep, and nutrition all count."),
  i("athletic", "any", "any", "needs_support", "Every athlete has tough stretches. Focus on the basics: sleep, eat, recover."),
  i("athletic", "1-3", "any", "any", "Building your athletic foundation. Every practice, every recovery session counts!"),
  i("athletic", "4-6", "any", "any", "You're developing serious game readiness. Stay locked in."),
  i("athletic", "7", "any", "any", "Mastery mode: you set the standard for your teammates. Lead by example."),
];
