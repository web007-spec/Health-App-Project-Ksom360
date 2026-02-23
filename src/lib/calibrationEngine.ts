/**
 * Calibration Engine — Adaptive Weight Learning (Silent Intelligence Layer)
 *
 * Analyses statistical correlations between factor scores and real outcomes.
 * Does NOT mutate visible weights. Informs Copilot suggestion priority
 * and Coach Intelligence analytics only.
 *
 * Safeguards:
 * - Minimum 20 samples before correlation activates
 * - No auto weight mutation
 * - No retroactive level changes
 * - Calibration resets per engine switch
 */

import type { EngineMode } from "@/lib/engineConfig";
import type { ScoreFactor } from "@/lib/recommendationEngine";

// ─── Types ──────────────────────────────────────────────

export interface FactorImpact {
  factor: ScoreFactor;
  correlation: number; // -1 to 1
  sampleSize: number;
  trend: "up" | "down" | "flat";
  isActive: boolean; // only true if sampleSize >= MIN_SAMPLES
}

export interface CalibrationResult {
  engine: EngineMode;
  factors: FactorImpact[];
  primaryDriver: FactorImpact | null;
  weakestLink: FactorImpact | null;
}

export interface OutcomeData {
  weekNumber: number;
  factorScores: Record<string, number>;
  bodyweightDelta?: number | null;
  performanceDelta?: number | null;
  recoveryDelta?: number | null;
  injuryFlag?: boolean;
  adherenceScore?: number | null;
}

// ─── Constants ──────────────────────────────────────────

const MIN_SAMPLES = 20;

const ENGINE_OUTCOME_MAP: Record<EngineMode, string> = {
  metabolic: "bodyweightDelta",
  performance: "performanceDelta",
  athletic: "recoveryDelta",
};

const ENGINE_FACTORS: Record<EngineMode, ScoreFactor[]> = {
  metabolic: ["fasting", "sleep", "nutrition", "weekly_completion"],
  performance: ["workout", "sleep", "recovery", "fasting", "weekly_completion"],
  athletic: ["sleep", "training_load", "recovery", "nutrition"],
};

// ─── Correlation Math ───────────────────────────────────

/**
 * Pearson correlation coefficient between two arrays.
 * Returns 0 if insufficient data.
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;

  const xs = x.slice(0, n);
  const ys = y.slice(0, n);

  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  if (den === 0) return 0;

  return Math.round((num / den) * 1000) / 1000;
}

function getTrend(values: number[]): "up" | "down" | "flat" {
  if (values.length < 3) return "flat";
  const recent = values.slice(0, Math.ceil(values.length / 2));
  const older = values.slice(Math.ceil(values.length / 2));
  const avgRecent = recent.reduce((s, v) => s + v, 0) / recent.length;
  const avgOlder = older.reduce((s, v) => s + v, 0) / older.length;
  if (avgRecent - avgOlder > 2) return "up";
  if (avgOlder - avgRecent > 2) return "down";
  return "flat";
}

// ─── Public API ─────────────────────────────────────────

/**
 * Compute calibration results from historical outcome data.
 * Pure function — no side effects, no DB writes.
 */
export function computeCalibration(
  engine: EngineMode,
  outcomes: OutcomeData[],
): CalibrationResult {
  const factors = ENGINE_FACTORS[engine] || [];
  const outcomeKey = ENGINE_OUTCOME_MAP[engine];

  // For athletic engine, also check injury correlation
  const isAthletic = engine === "athletic";

  const impacts: FactorImpact[] = factors.map((factor) => {
    // Extract paired data points
    const pairs: { score: number; outcome: number }[] = [];

    for (const o of outcomes) {
      const score = o.factorScores[factor];
      let outcome: number | undefined;

      if (isAthletic && o.injuryFlag !== undefined) {
        // For athletic: higher score should correlate with fewer injuries
        outcome = o.injuryFlag ? -10 : (o.recoveryDelta ?? undefined);
      } else {
        outcome = (o as any)[outcomeKey] ?? undefined;
      }

      if (score != null && outcome != null) {
        pairs.push({ score, outcome });
      }
    }

    const scores = pairs.map((p) => p.score);
    const outcomeValues = pairs.map((p) => p.outcome);

    const correlation = pearsonCorrelation(scores, outcomeValues);
    const trend = getTrend(scores);

    return {
      factor,
      correlation,
      sampleSize: pairs.length,
      trend,
      isActive: pairs.length >= MIN_SAMPLES,
    };
  });

  // Sort by absolute correlation strength
  const activeImpacts = impacts.filter((i) => i.isActive);
  const sorted = [...activeImpacts].sort(
    (a, b) => Math.abs(b.correlation) - Math.abs(a.correlation),
  );

  return {
    engine,
    factors: impacts,
    primaryDriver: sorted[0] || null,
    weakestLink: sorted.length > 0 ? sorted[sorted.length - 1] : null,
  };
}

/**
 * Get Copilot suggestion priority multipliers based on calibration.
 * Returns a map of factor → priority multiplier (0.5 to 1.5).
 * Factors with strong positive correlation get higher priority.
 * Factors with weak correlation get deprioritized.
 */
export function getCopilotPriorityMultipliers(
  calibration: CalibrationResult,
): Record<string, number> {
  const multipliers: Record<string, number> = {};

  for (const impact of calibration.factors) {
    if (!impact.isActive) {
      // Not enough data — neutral priority
      multipliers[impact.factor] = 1.0;
      continue;
    }

    const absCorr = Math.abs(impact.correlation);

    if (absCorr >= 0.6) {
      // Strong correlation → high priority
      multipliers[impact.factor] = 1.4;
    } else if (absCorr >= 0.3) {
      // Moderate correlation → slight boost
      multipliers[impact.factor] = 1.15;
    } else {
      // Weak correlation → deprioritize
      multipliers[impact.factor] = 0.7;
    }
  }

  return multipliers;
}

/**
 * Get engine-specific outcome labels for display.
 */
export const ENGINE_OUTCOME_LABELS: Record<EngineMode, string> = {
  metabolic: "Fat Loss Prediction",
  performance: "Performance Gains",
  athletic: "Injury Risk Reduction",
};

export const FACTOR_DISPLAY_LABELS: Record<string, string> = {
  fasting: "Fasting Adherence",
  sleep: "Sleep Quality",
  nutrition: "Nutrition Consistency",
  weekly_completion: "Weekly Completion",
  workout: "Workout Performance",
  recovery: "Recovery Balance",
  training_load: "Training Load",
};
