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
  i("metabolic", "1-3", "fasting", "strong", "Your fasting consistency is building a reliable metabolic rhythm. Stay the course.", "Complete today's fasting window on schedule."),
  i("metabolic", "1-3", "fasting", "moderate", "Fasting adherence is developing. Consistent windows train your body's internal clock."),
  i("metabolic", "1-3", "fasting", "needs_support", "Missed fasting windows reset your metabolic clock. Aim for the minimum window today.", "Start your fast within the next hour."),
  i("metabolic", "4-6", "fasting", "strong", "Metabolic stability is evident. Your body is adapting to structured fasting cycles."),
  i("metabolic", "4-6", "fasting", "moderate", "Your fasting rhythm has room for improvement. Tighten your eating window by 30 minutes.", "Close your eating window 30 minutes earlier."),
  i("metabolic", "4-6", "fasting", "needs_support", "Fasting inconsistency undermines metabolic adaptation. Reset with a clean 14-hour fast today.", "Complete a clean 14h fast today."),
  i("metabolic", "7", "fasting", "strong", "Mastery-level fasting. Your metabolic flexibility allows controlled window adjustments."),
  i("metabolic", "7", "fasting", "moderate", "Even at mastery, consistency matters. Tighten your window back to baseline this week."),

  // Sleep
  i("metabolic", "1-3", "sleep", "any", "Sleep is the foundation of metabolic regulation. Prioritize 7+ hours tonight.", "Set a bedtime alarm for tonight."),
  i("metabolic", "4-6", "sleep", "strong", "Quality sleep is amplifying your metabolic gains. Protect this rhythm."),
  i("metabolic", "4-6", "sleep", "needs_support", "Poor sleep disrupts insulin sensitivity and hunger hormones. Make sleep your top priority.", "No screens 30 minutes before bed tonight."),
  i("metabolic", "7", "sleep", "any", "At mastery level, sleep quality fine-tunes metabolic optimization. Guard it carefully."),

  // Nutrition
  i("metabolic", "1-3", "nutrition", "strong", "Nutritional discipline is building. Controlled eating within your window strengthens metabolic stability."),
  i("metabolic", "1-3", "nutrition", "moderate", "Nutrition regulation is key to metabolic rhythm. Focus on balanced meals within your window.", "Plan your meals before breaking your fast."),
  i("metabolic", "1-3", "nutrition", "needs_support", "Unregulated eating patterns destabilize metabolic progress. Start with one structured meal today."),
  i("metabolic", "4-6", "nutrition", "any", "Your nutritional patterns should be reinforcing fasting gains. Track meal quality, not just timing."),
  i("metabolic", "7", "nutrition", "any", "Mastery nutrition means intuitive eating within structure. Trust your regulated appetite."),

  // Recovery
  i("metabolic", "any", "recovery", "strong", "Recovery compliance supports long-term metabolic stability. Well done."),
  i("metabolic", "any", "recovery", "needs_support", "Recovery is not optional. Your body needs structured rest to adapt to fasting stress.", "Add a 10-minute wind-down routine tonight."),

  // Weekly completion
  i("metabolic", "1-3", "weekly_completion", "any", "Weekly consistency builds metabolic resilience. Each completed day compounds your progress."),
  i("metabolic", "4-6", "weekly_completion", "moderate", "Your weekly completion is slipping. Metabolic stability requires daily engagement.", "Check in and complete today's targets."),
  i("metabolic", "4-6", "weekly_completion", "strong", "Strong weekly completion rate. Your metabolic system is responding to this discipline."),
  i("metabolic", "7", "weekly_completion", "any", "At mastery level, weekly consistency is habitual. Maintain your standard."),

  // General metabolic
  i("metabolic", "any", "any", "strong", "Stability is your superpower. Consistent metabolic rhythm produces lasting change."),
  i("metabolic", "any", "any", "moderate", "Progress is not linear. Focus on the trend, not the day. Small adjustments compound."),
  i("metabolic", "any", "any", "needs_support", "When the system flags support needed, it means rest and regulation — not punishment."),
  i("metabolic", "1-3", "any", "any", "You are building the foundation. Every completed fast, every tracked meal — it all counts."),
  i("metabolic", "4-6", "any", "any", "Your metabolic engine is maturing. Precision matters more than effort now."),
  i("metabolic", "7", "any", "any", "Mastery is not the absence of challenge — it is the presence of control."),
  i("metabolic", "any", "any", "any", "Discipline compounds. Results follow. Small daily wins create visible change."),

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PERFORMANCE ENGINE (30 insights)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Workout
  i("performance", "1-3", "workout", "strong", "Strong workout completion. You're building the training base for long-term gains.", "Hit every set with intent today."),
  i("performance", "1-3", "workout", "moderate", "Missed sessions slow momentum. Get back to your training schedule today."),
  i("performance", "1-3", "workout", "needs_support", "Training consistency is your foundation. Even a reduced session beats a skipped one.", "Complete at least a warm-up and main lift today."),
  i("performance", "4-6", "workout", "strong", "Your training consistency is driving measurable adaptation. Keep pushing."),
  i("performance", "4-6", "workout", "moderate", "Performance gains require consistent stimulus. Don't let off-days become off-weeks.", "Schedule tomorrow's session now."),
  i("performance", "4-6", "workout", "needs_support", "Your training load has dropped. Reduce volume but maintain frequency to stay on track."),
  i("performance", "7", "workout", "strong", "Mastery-level training. You have the discipline to auto-regulate load. Trust your readiness."),
  i("performance", "7", "workout", "moderate", "Even at mastery, consistency drives performance. Adjust intensity, not attendance."),

  // Sleep
  i("performance", "1-3", "sleep", "any", "Sleep is where adaptation happens. Prioritize 7–8 hours to maximize training gains.", "Set your sleep target for tonight."),
  i("performance", "4-6", "sleep", "strong", "Quality sleep is powering your recovery and performance gains. Protect this asset."),
  i("performance", "4-6", "sleep", "needs_support", "Poor sleep directly reduces training output and recovery quality. Make it non-negotiable.", "No caffeine after 2pm today."),
  i("performance", "7", "sleep", "any", "At your level, sleep quality differentiates good from great performance."),

  // Recovery
  i("performance", "1-3", "recovery", "strong", "Good recovery habits. This balance between stress and rest drives progress."),
  i("performance", "1-3", "recovery", "needs_support", "Recovery is not passive — it's active preparation for your next session.", "Add mobility work or a recovery walk today."),
  i("performance", "4-6", "recovery", "any", "Recovery balance determines your training ceiling. Invest in it like you invest in training."),
  i("performance", "7", "recovery", "any", "Mastery recovery means knowing when to push and when to pull back. Trust the data."),

  // Fasting (secondary for performance)
  i("performance", "any", "fasting", "strong", "Fasting is supporting your performance toolkit. Solid adherence."),
  i("performance", "any", "fasting", "moderate", "Fasting is a tool, not a requirement. Adjust timing around training for best results."),
  i("performance", "any", "fasting", "needs_support", "If fasting is impacting training quality, reduce window length or pause it."),

  // Nutrition & completion
  i("performance", "any", "nutrition", "strong", "Nutrition is fueling your performance gains. Keep protein targets consistent."),
  i("performance", "any", "nutrition", "needs_support", "Under-fueling sabotages training adaptation. Prioritize adequate nutrition today.", "Hit your protein target today."),
  i("performance", "1-3", "weekly_completion", "any", "Consistency builds capacity. Show up every scheduled day this week."),
  i("performance", "4-6", "weekly_completion", "moderate", "Your weekly completion is below target. Performance requires sustained effort.", "Complete all remaining sessions this week."),
  i("performance", "7", "weekly_completion", "any", "At mastery, your weekly rhythm should be self-sustaining. Maintain the standard."),

  // General performance
  i("performance", "any", "any", "strong", "Your readiness score reflects real capacity. You've earned this momentum."),
  i("performance", "any", "any", "moderate", "Forward momentum requires daily commitment. One strong day leads to the next."),
  i("performance", "any", "any", "needs_support", "Rest is not regression. Strategic recovery builds the base for your next push."),
  i("performance", "1-3", "any", "any", "Build the habits now that will carry you through advanced programming later."),
  i("performance", "4-6", "any", "any", "You're past the beginner phase. Precision in execution separates good from great."),
  i("performance", "7", "any", "any", "Mastery means self-regulation within structure. You know what works — execute it."),

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
