/**
 * Feature Access Guard — Subscription Tier Gating
 *
 * Controls feature availability based on subscription_tier:
 * starter | pro | elite | enterprise
 *
 * Rules:
 * - Engine availability based on tier
 * - Level caps per tier
 * - Feature locks with professional messaging
 * - Never breaks layout — shows locked badge + upgrade CTA
 */

import type { EngineMode } from "@/lib/engineConfig";

export type SubscriptionTier = "starter" | "pro" | "elite" | "enterprise";

export type GatedFeature =
  | "engine_metabolic"
  | "engine_athletic"
  | "level_5_6"
  | "level_7"
  | "guardian_link"
  | "coach_overrides"
  | "insight_pinning"
  | "analytics_dashboard"
  | "advanced_nudges"
  | "plan_gating_unlocked"
  | "advanced_scoring"
  | "insights_enabled"
  | "multi_coach"
  | "white_label"
  | "api_access";

// ─── Tier → Feature mapping ────────────────────────────

const TIER_FEATURES: Record<SubscriptionTier, Set<GatedFeature>> = {
  starter: new Set<GatedFeature>([]),
  pro: new Set<GatedFeature>([
    "engine_metabolic",
    "level_5_6",
    "advanced_scoring",
    "insights_enabled",
    "analytics_dashboard",
    "advanced_nudges",
  ]),
  elite: new Set<GatedFeature>([
    "engine_metabolic",
    "engine_athletic",
    "level_5_6",
    "level_7",
    "guardian_link",
    "coach_overrides",
    "insight_pinning",
    "analytics_dashboard",
    "advanced_nudges",
    "advanced_scoring",
    "insights_enabled",
    "plan_gating_unlocked",
  ]),
  enterprise: new Set<GatedFeature>([
    "engine_metabolic",
    "engine_athletic",
    "level_5_6",
    "level_7",
    "guardian_link",
    "coach_overrides",
    "insight_pinning",
    "analytics_dashboard",
    "advanced_nudges",
    "advanced_scoring",
    "insights_enabled",
    "plan_gating_unlocked",
    "multi_coach",
    "white_label",
    "api_access",
  ]),
};

// ─── Engine availability ────────────────────────────────

const TIER_ENGINES: Record<SubscriptionTier, EngineMode[]> = {
  starter: ["performance"],
  pro: ["performance", "metabolic"],
  elite: ["performance", "metabolic", "athletic"],
  enterprise: ["performance", "metabolic", "athletic"],
};

// ─── Level caps ─────────────────────────────────────────

const TIER_MAX_LEVEL: Record<SubscriptionTier, number> = {
  starter: 4,
  pro: 6,
  elite: 7,
  enterprise: 7,
};

// ─── Subscription status types ──────────────────────────

export type SubscriptionStatus = "active" | "past_due" | "canceled" | "incomplete" | "trialing";

export interface BillingState {
  subscriptionStatus: SubscriptionStatus;
  gracePeriodEndsAt: string | null;
}

/** Returns the effective tier after applying billing status / grace period rules. */
export function getEffectiveTier(
  tier: SubscriptionTier,
  billing?: BillingState | null,
): SubscriptionTier {
  if (!billing) return tier; // no billing info → trust stored tier
  const { subscriptionStatus, gracePeriodEndsAt } = billing;

  // Active or trialing → full tier
  if (subscriptionStatus === "active" || subscriptionStatus === "trialing") return tier;

  // Past-due or canceled but within grace period → keep tier
  if (gracePeriodEndsAt && new Date(gracePeriodEndsAt) > new Date()) return tier;

  // Grace expired or incomplete → downgrade to starter
  return "starter";
}

// ─── Public API ─────────────────────────────────────────

export function hasFeatureAccess(tier: SubscriptionTier, feature: GatedFeature): boolean {
  return TIER_FEATURES[tier]?.has(feature) ?? false;
}

export function getAvailableEngines(tier: SubscriptionTier): EngineMode[] {
  return TIER_ENGINES[tier] || ["performance"];
}

export function getMaxLevel(tier: SubscriptionTier): number {
  return TIER_MAX_LEVEL[tier] || 4;
}

export function isEngineLocked(tier: SubscriptionTier, engine: EngineMode): boolean {
  return !getAvailableEngines(tier).includes(engine);
}

export function isLevelLocked(tier: SubscriptionTier, level: number): boolean {
  return level > getMaxLevel(tier);
}

export function getRequiredTierForFeature(feature: GatedFeature): SubscriptionTier {
  if (TIER_FEATURES.starter.has(feature)) return "starter";
  if (TIER_FEATURES.pro.has(feature)) return "pro";
  if (TIER_FEATURES.elite.has(feature)) return "elite";
  return "enterprise";
}

export function getRequiredTierForEngine(engine: EngineMode): SubscriptionTier {
  if (engine === "performance") return "starter";
  if (engine === "metabolic") return "pro";
  return "elite"; // athletic
}

// ─── Tier display ───────────────────────────────────────

export const TIER_DISPLAY: Record<SubscriptionTier, { label: string; description: string }> = {
  starter: {
    label: "Starter",
    description: "Core performance training with foundational scoring.",
  },
  pro: {
    label: "Pro",
    description: "Multi-engine access with advanced insights and analytics.",
  },
  elite: {
    label: "Elite",
    description: "Full platform access including guardian oversight and mastery progression.",
  },
  enterprise: {
    label: "Enterprise",
    description: "Complete platform with multi-coach support and white-label capabilities.",
  },
};

// ─── Upgrade copy by engine tone ────────────────────────

export function getUpgradeCopy(engine: EngineMode): { headline: string; subtext: string } {
  switch (engine) {
    case "metabolic":
      return {
        headline: "Unlock your full metabolic potential.",
        subtext: "Upgrade to access advanced fasting structures, deeper scoring, and coach-level analytics.",
      };
    case "performance":
      return {
        headline: "Elevate your training with complete tools.",
        subtext: "Upgrade to unlock multi-engine support, advanced insights, and full progression.",
      };
    case "athletic":
      return {
        headline: "Build a stronger competitive edge.",
        subtext: "Upgrade to access guardian oversight, full-level progression, and advanced recovery tools.",
      };
    default:
      return {
        headline: "Unlock the full platform.",
        subtext: "Upgrade your plan to access advanced features.",
      };
  }
}

// ─── Comparison table data ──────────────────────────────

export interface TierComparisonRow {
  feature: string;
  starter: boolean | string;
  pro: boolean | string;
  elite: boolean | string;
  enterprise: boolean | string;
}

export const TIER_COMPARISON: TierComparisonRow[] = [
  { feature: "Performance Engine", starter: true, pro: true, elite: true, enterprise: true },
  { feature: "Metabolic Engine", starter: false, pro: true, elite: true, enterprise: true },
  { feature: "Athletic Engine", starter: false, pro: false, elite: true, enterprise: true },
  { feature: "Level Progression", starter: "1–4", pro: "1–6", elite: "1–7", enterprise: "1–7" },
  { feature: "Engine Scoring", starter: "Basic", pro: "Advanced", elite: "Advanced", enterprise: "Advanced" },
  { feature: "Insights", starter: false, pro: true, elite: true, enterprise: true },
  { feature: "Smart Nudges", starter: "Basic", pro: "Advanced", elite: "Advanced", enterprise: "Advanced" },
  { feature: "Analytics Dashboard", starter: false, pro: true, elite: true, enterprise: true },
  { feature: "Guardian Link", starter: false, pro: false, elite: true, enterprise: true },
  { feature: "Coach Overrides", starter: false, pro: false, elite: true, enterprise: true },
  { feature: "Insight Pinning", starter: false, pro: false, elite: true, enterprise: true },
  { feature: "Multi-Coach", starter: false, pro: false, elite: false, enterprise: true },
  { feature: "White-Label", starter: false, pro: false, elite: false, enterprise: true },
];
