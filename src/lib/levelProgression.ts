/**
 * Level Progression System
 *
 * Universal 1–7 level system inside each engine.
 * Levels represent progression depth; engines represent mode.
 *
 * Advancement requires ALL criteria met over 14 days:
 * - 14+ days in current level
 * - 80+ avg engine score (last 14 days)
 * - 85% weekly completion avg (last 2 weeks)
 * - 10+ day streak
 * - ≤2 "Needs Support" days in last 14 days
 */

import type { EngineMode } from "@/lib/engineConfig";
import type { EngineResult, StatusLabel } from "@/lib/recommendationEngine";

// ─── Types ──────────────────────────────────────────────

export type LevelStatus = "active" | "eligible" | "completed";

export interface LevelDefinition {
  level: number;
  name: string;
  description: string;
  /** Engine-specific allowed ranges */
  metabolicRange: string;
  performanceRange: string;
  athleticRange: string;
  /** Recommendation aggressiveness: conservative → moderate → aggressive */
  aggressiveness: "conservative" | "moderate" | "aggressive";
  /** Insight tone modifier */
  toneModifier: "supportive" | "neutral" | "challenging";
}

export interface LevelCriteria {
  label: string;
  met: boolean;
  current: string;
  required: string;
}

export interface LevelProgressionState {
  currentLevel: number;
  levelName: string;
  levelStatus: LevelStatus;
  completionPct: number;
  daysInLevel: number;
  isEligible: boolean;
  isMastery: boolean;
  criteria: LevelCriteria[];
  nextLevel: LevelDefinition | null;
}

// ─── Level Definitions ──────────────────────────────────

export const LEVEL_DEFINITIONS: LevelDefinition[] = [
  {
    level: 1,
    name: "Foundation",
    description: "Building baseline habits and consistency.",
    metabolicRange: "12–14h fasting window",
    performanceRange: "2–3 sessions/week",
    athleticRange: "Base conditioning",
    aggressiveness: "conservative",
    toneModifier: "supportive",
  },
  {
    level: 2,
    name: "Adaptation",
    description: "Habits forming. Body adapting to structure.",
    metabolicRange: "14–15h fasting window",
    performanceRange: "3–4 sessions/week",
    athleticRange: "Sport-specific basics",
    aggressiveness: "conservative",
    toneModifier: "supportive",
  },
  {
    level: 3,
    name: "Development",
    description: "Consistent execution. Ready for progressive load.",
    metabolicRange: "15–16h fasting window",
    performanceRange: "4 sessions/week",
    athleticRange: "Structured training blocks",
    aggressiveness: "moderate",
    toneModifier: "neutral",
  },
  {
    level: 4,
    name: "Strengthening",
    description: "Solid foundation. Pushing capacity boundaries.",
    metabolicRange: "16h fasting window",
    performanceRange: "4–5 sessions/week",
    athleticRange: "Performance periodization",
    aggressiveness: "moderate",
    toneModifier: "neutral",
  },
  {
    level: 5,
    name: "Optimization",
    description: "Fine-tuning for peak performance windows.",
    metabolicRange: "16–17h fasting window",
    performanceRange: "5 sessions/week",
    athleticRange: "Competition prep",
    aggressiveness: "aggressive",
    toneModifier: "challenging",
  },
  {
    level: 6,
    name: "Advanced",
    description: "High-level execution with minimal coaching friction.",
    metabolicRange: "17–18h fasting window",
    performanceRange: "5–6 sessions/week",
    athleticRange: "Peak competition",
    aggressiveness: "aggressive",
    toneModifier: "challenging",
  },
  {
    level: 7,
    name: "Mastery",
    description: "Self-directed within guardrails. Optimization over correction.",
    metabolicRange: "16–18h flexible window",
    performanceRange: "Load adjusts ±10%",
    athleticRange: "Game-adaptive intensity",
    aggressiveness: "aggressive",
    toneModifier: "challenging",
  },
];

// ─── Advancement Logic ──────────────────────────────────

const MIN_DAYS_IN_LEVEL = 14;
const MIN_AVG_SCORE = 80;
const MIN_WEEKLY_COMPLETION_PCT = 85;
const MIN_STREAK = 10;
const MAX_NEEDS_SUPPORT_DAYS = 2;

export function getLevelDefinition(level: number): LevelDefinition {
  return LEVEL_DEFINITIONS[Math.min(Math.max(level, 1), 7) - 1];
}

export function getLevelRange(level: number, engine: EngineMode): string {
  const def = getLevelDefinition(level);
  switch (engine) {
    case "metabolic":
      return def.metabolicRange;
    case "performance":
      return def.performanceRange;
    case "athletic":
      return def.athleticRange;
  }
}

export interface DailyScoreEntry {
  score: number;
  status: StatusLabel;
  completed: boolean; // check-in or workout completed
}

export function evaluateLevelEligibility(
  currentLevel: number,
  daysInLevel: number,
  last14DaysScores: DailyScoreEntry[],
  currentStreak: number,
): { isEligible: boolean; completionPct: number; criteria: LevelCriteria[] } {
  // Level 7 = mastery, no further advancement
  if (currentLevel >= 7) {
    return {
      isEligible: false,
      completionPct: 100,
      criteria: [],
    };
  }

  const avgScore =
    last14DaysScores.length > 0
      ? last14DaysScores.reduce((s, d) => s + d.score, 0) / last14DaysScores.length
      : 0;

  const completedDays = last14DaysScores.filter((d) => d.completed).length;
  const weeklyCompletionPct = last14DaysScores.length > 0
    ? (completedDays / last14DaysScores.length) * 100
    : 0;

  const needsSupportDays = last14DaysScores.filter((d) => d.status === "needs_support").length;

  const criteria: LevelCriteria[] = [
    {
      label: "Days in level",
      met: daysInLevel >= MIN_DAYS_IN_LEVEL,
      current: `${daysInLevel}`,
      required: `${MIN_DAYS_IN_LEVEL}+`,
    },
    {
      label: "Average score",
      met: avgScore >= MIN_AVG_SCORE,
      current: `${Math.round(avgScore)}`,
      required: `${MIN_AVG_SCORE}+`,
    },
    {
      label: "Weekly completion",
      met: weeklyCompletionPct >= MIN_WEEKLY_COMPLETION_PCT,
      current: `${Math.round(weeklyCompletionPct)}%`,
      required: `${MIN_WEEKLY_COMPLETION_PCT}%+`,
    },
    {
      label: "Current streak",
      met: currentStreak >= MIN_STREAK,
      current: `${currentStreak}d`,
      required: `${MIN_STREAK}d+`,
    },
    {
      label: "Low days (last 14)",
      met: needsSupportDays <= MAX_NEEDS_SUPPORT_DAYS,
      current: `${needsSupportDays}`,
      required: `≤${MAX_NEEDS_SUPPORT_DAYS}`,
    },
  ];

  const metCount = criteria.filter((c) => c.met).length;
  const completionPct = Math.round((metCount / criteria.length) * 100);
  const isEligible = criteria.every((c) => c.met);

  return { isEligible, completionPct, criteria };
}
