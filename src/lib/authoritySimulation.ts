/**
 * Authority Simulation Utility
 *
 * Test matrix for all engine × tier × toggle combinations.
 * Used for internal validation — not user-facing.
 */

import { checkAuthorityGate, type SubscriptionTier } from "@/lib/featureAccessGuard";
import type { EngineMode } from "@/lib/engineConfig";

export type AuthorityAction =
  | "level_auto_advance"
  | "plan_adjust"
  | "ai_draft"
  | "nudge_optimization"
  | "recommendation_recalibration";

const ACTION_TOGGLE_MAP: Record<AuthorityAction, string> = {
  level_auto_advance: "auto_level_advance_enabled",
  plan_adjust: "auto_plan_adjust_enabled",
  ai_draft: "ai_suggestions_enabled",
  nudge_optimization: "auto_nudge_optimization_enabled",
  recommendation_recalibration: "ai_suggestions_enabled",
};

export interface SimulationResult {
  engine: EngineMode;
  tier: SubscriptionTier;
  action: AuthorityAction;
  toggleOn: boolean;
  allowed: boolean;
}

const ENGINES: EngineMode[] = ["metabolic", "performance", "athletic"];
const TIERS: SubscriptionTier[] = ["starter", "pro", "elite", "enterprise"];
const ACTIONS: AuthorityAction[] = [
  "level_auto_advance",
  "plan_adjust",
  "ai_draft",
  "nudge_optimization",
  "recommendation_recalibration",
];

/**
 * Run the full authority simulation matrix.
 * Returns an array of results for every combination.
 */
export function runAuthoritySimulation(): SimulationResult[] {
  const results: SimulationResult[] = [];

  for (const engine of ENGINES) {
    for (const tier of TIERS) {
      for (const action of ACTIONS) {
        for (const toggleOn of [true, false]) {
          results.push({
            engine,
            tier,
            action,
            toggleOn,
            allowed: checkAuthorityGate(tier, engine, toggleOn),
          });
        }
      }
    }
  }

  return results;
}

/**
 * Check if a specific automation action is allowed.
 */
export function isAutomationAllowed(
  engine: EngineMode,
  tier: SubscriptionTier,
  toggleValue: boolean,
): boolean {
  return checkAuthorityGate(tier, engine, toggleValue);
}
