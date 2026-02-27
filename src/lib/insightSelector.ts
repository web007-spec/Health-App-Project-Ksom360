/**
 * Insight Selection Engine
 *
 * Priority-based matching:
 * 1. engine_mode (required match)
 * 2. lowest_factor match (weighted +3)
 * 3. current_level band match (weighted +2)
 * 4. score_status match (weighted +1)
 * 5. No repeats within last 7 days
 */

import type { EngineMode } from "@/lib/engineConfig";
import type { ScoreFactor, StatusLabel } from "@/lib/recommendationEngine";
import { INSIGHT_LIBRARY, type InsightEntry, type LevelBand } from "@/lib/insightLibrary";

function getLevelBand(level: number): LevelBand {
  if (level >= 7) return "7";
  if (level >= 4) return "4-6";
  return "1-3";
}

export function selectInsight(
  engine: EngineMode,
  currentLevel: number,
  status: StatusLabel,
  lowestFactor: ScoreFactor,
  recentInsightIds: string[],
): InsightEntry {
  const recentSet = new Set(recentInsightIds);
  const levelBand = getLevelBand(currentLevel);

  // Filter to engine match only, excluding recent
  const candidates = INSIGHT_LIBRARY.filter(
    (ins) => ins.engine === engine && !recentSet.has(ins.id)
  );

  if (candidates.length === 0) {
    // Fallback: allow repeats if all exhausted
    const fallbacks = INSIGHT_LIBRARY.filter((ins) => ins.engine === engine);
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  // Score each candidate
  const scored = candidates.map((ins) => {
    let score = 0;

    // Factor match (+3)
    if (ins.factor === lowestFactor) score += 3;
    else if (ins.factor === "any") score += 0.5;

    // Level band match (+2)
    if (ins.levelBand === levelBand) score += 2;
    else if (ins.levelBand === "any") score += 0.5;

    // Status match (+1)
    if (ins.status === status) score += 1;
    else if (ins.status === "any") score += 0.3;

    return { ins, score };
  });

  // Sort by score descending, then pick from top tier with slight randomness
  scored.sort((a, b) => b.score - a.score);
  const topScore = scored[0].score;
  const topTier = scored.filter((s) => s.score >= topScore - 0.5);

  return topTier[Math.floor(Math.random() * topTier.length)].ins;
}
