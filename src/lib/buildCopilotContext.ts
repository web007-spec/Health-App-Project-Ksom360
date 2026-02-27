/**
 * Copilot Context Builder
 *
 * Assembles a structured, privacy-safe context object
 * for the AI Coach Copilot. No raw personal logs included.
 */

import type { EngineMode } from "@/lib/engineConfig";

export interface CopilotContext {
  engine_mode: EngineMode;
  current_level: number;
  level_band: "1-3" | "4-6" | "7";
  readiness_score: number | null;
  status: string;
  lowest_factor: string | null;
  weekly_completion_pct: number | null;
  streak_days: number | null;
  last_7_day_trend: "up" | "down" | "flat";
  parent_link_active: boolean;
}

export function getLevelBand(level: number): "1-3" | "4-6" | "7" {
  if (level >= 7) return "7";
  if (level >= 4) return "4-6";
  return "1-3";
}

export function buildCopilotContext(params: {
  engineMode: EngineMode;
  currentLevel: number;
  readinessScore: number | null;
  status: string;
  lowestFactor: string | null;
  weeklyCompletionPct: number | null;
  streakDays: number | null;
  trendDirection: "up" | "down" | "flat";
  parentLinkActive: boolean;
}): CopilotContext {
  return {
    engine_mode: params.engineMode,
    current_level: params.currentLevel,
    level_band: getLevelBand(params.currentLevel),
    readiness_score: params.readinessScore,
    status: params.status,
    lowest_factor: params.lowestFactor,
    weekly_completion_pct: params.weeklyCompletionPct,
    streak_days: params.streakDays,
    last_7_day_trend: params.trendDirection,
    parent_link_active: params.parentLinkActive,
  };
}

/**
 * Returns engine-specific tone instruction for the AI prompt.
 */
export function getEngineTone(engine: EngineMode): string {
  switch (engine) {
    case "metabolic":
      return "Use a structured, clinical tone. Focus on metabolic health, fasting adherence, and physiological stability.";
    case "performance":
      return "Use a confident, direct tone. Focus on training readiness, workout performance, and progressive overload.";
    case "athletic":
      return "Use an energetic, growth-oriented tone. Focus on recovery, game readiness, and competitive development.";
    default:
      return "Use a professional coaching tone.";
  }
}
