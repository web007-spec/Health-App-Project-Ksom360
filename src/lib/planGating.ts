/**
 * Plan Gating Logic — Adaptive Plan Visibility & Smart Unlocks
 *
 * Controls what plans a client can access based on:
 * - engine_mode
 * - current_level
 * - score stability
 * - engine-specific safety rules
 * - coach overrides
 */

import type { EngineMode } from "@/lib/engineConfig";
import type { StatusLabel, ScoreFactor } from "@/lib/recommendationEngine";

// ─── Types ──────────────────────────────────────────────

export type IntensityTier = "low" | "medium" | "high" | "extreme";
export type PlanType = "fasting" | "training" | "recovery" | "fueling";

export interface PlanGatingMetadata {
  id: string;
  name: string;
  engine_allowed: string[];
  min_level_required: number;
  max_level_allowed: number | null;
  plan_type: PlanType;
  intensity_tier: IntensityTier;
  is_extended_fast: boolean;
  is_youth_safe: boolean;
}

export interface ClientGatingContext {
  engineMode: EngineMode;
  currentLevel: number;
  scoreStatus: StatusLabel;
  last7DayAvgScore: number;
  needsSupportDaysLast14: number;
  fastingEnabled: boolean;
  lowestFactor: ScoreFactor;
  upcomingGameOrPractice: boolean;
  overriddenPlanIds: Set<string>;
}

export type LockReason =
  | "level_locked"
  | "stability_locked"
  | "coach_approval"
  | "engine_mode"
  | "youth_safety"
  | "optional_tool"
  | null;

export interface PlanGatingResult {
  planId: string;
  isVisible: boolean;      // whether to render at all
  isAccessible: boolean;   // whether client can select it
  lockReason: LockReason;
  lockMessage: string | null;
  isCoachApproved: boolean;
  isOptionalTool: boolean;
}

// ─── Lock reason copy ───────────────────────────────────

function getLockMessage(reason: LockReason, minLevel?: number): string | null {
  switch (reason) {
    case "level_locked":
      return `Locked — available at Level ${minLevel ?? "?"}`;
    case "stability_locked":
      return "Temporarily locked — stability required";
    case "coach_approval":
      return "Coach approval required";
    case "engine_mode":
      return "Not available in your engine mode";
    case "youth_safety":
      return "Youth safety restriction";
    case "optional_tool":
      return null; // visible but marked as optional
    default:
      return null;
  }
}

// ─── Core gating evaluation ─────────────────────────────

export function evaluatePlanGating(
  plan: PlanGatingMetadata,
  ctx: ClientGatingContext,
): PlanGatingResult {
  const isCoachApproved = ctx.overriddenPlanIds.has(plan.id);

  // If coach override exists, always accessible
  if (isCoachApproved) {
    return {
      planId: plan.id,
      isVisible: true,
      isAccessible: true,
      lockReason: null,
      lockMessage: null,
      isCoachApproved: true,
      isOptionalTool: false,
    };
  }

  // ── Athletic engine: hide all fasting plans entirely
  if (ctx.engineMode === "athletic" && plan.plan_type === "fasting") {
    return {
      planId: plan.id,
      isVisible: false,
      isAccessible: false,
      lockReason: "youth_safety",
      lockMessage: getLockMessage("youth_safety"),
      isCoachApproved: false,
      isOptionalTool: false,
    };
  }

  // ── Athletic engine: only youth-safe plans visible
  if (ctx.engineMode === "athletic" && !plan.is_youth_safe) {
    return {
      planId: plan.id,
      isVisible: false,
      isAccessible: false,
      lockReason: "youth_safety",
      lockMessage: getLockMessage("youth_safety"),
      isCoachApproved: false,
      isOptionalTool: false,
    };
  }

  // ── Athletic engine: hide extreme conditioning if game within 48h
  if (
    ctx.engineMode === "athletic" &&
    ctx.upcomingGameOrPractice &&
    plan.intensity_tier === "extreme"
  ) {
    return {
      planId: plan.id,
      isVisible: false,
      isAccessible: false,
      lockReason: "youth_safety",
      lockMessage: getLockMessage("youth_safety"),
      isCoachApproved: false,
      isOptionalTool: false,
    };
  }

  // ── Engine mode check
  if (!plan.engine_allowed.includes(ctx.engineMode)) {
    return {
      planId: plan.id,
      isVisible: false,
      isAccessible: false,
      lockReason: "engine_mode",
      lockMessage: getLockMessage("engine_mode"),
      isCoachApproved: false,
      isOptionalTool: false,
    };
  }

  // ── Performance engine: fasting plans marked as "Optional Tool" when fasting disabled
  const isOptionalTool =
    ctx.engineMode === "performance" &&
    !ctx.fastingEnabled &&
    plan.plan_type === "fasting";

  // ── Level check
  if (ctx.currentLevel < plan.min_level_required) {
    return {
      planId: plan.id,
      isVisible: true,
      isAccessible: false,
      lockReason: "level_locked",
      lockMessage: getLockMessage("level_locked", plan.min_level_required),
      isCoachApproved: false,
      isOptionalTool,
    };
  }

  if (plan.max_level_allowed !== null && ctx.currentLevel > plan.max_level_allowed) {
    return {
      planId: plan.id,
      isVisible: true,
      isAccessible: false,
      lockReason: "level_locked",
      lockMessage: `Locked — designed for Levels ${plan.min_level_required}–${plan.max_level_allowed}`,
      isCoachApproved: false,
      isOptionalTool,
    };
  }

  // ── Dynamic safety: Needs Support locks high/extreme
  if (
    ctx.scoreStatus === "needs_support" &&
    (plan.intensity_tier === "high" || plan.intensity_tier === "extreme")
  ) {
    return {
      planId: plan.id,
      isVisible: true,
      isAccessible: false,
      lockReason: "stability_locked",
      lockMessage: getLockMessage("stability_locked"),
      isCoachApproved: false,
      isOptionalTool,
    };
  }

  // ── Dynamic safety: 3+ needs support days in 14 locks advanced plans
  if (
    ctx.needsSupportDaysLast14 >= 3 &&
    (plan.intensity_tier === "high" || plan.intensity_tier === "extreme")
  ) {
    return {
      planId: plan.id,
      isVisible: true,
      isAccessible: false,
      lockReason: "stability_locked",
      lockMessage: getLockMessage("stability_locked"),
      isCoachApproved: false,
      isOptionalTool,
    };
  }

  // ── Metabolic: extended fast gating
  if (
    ctx.engineMode === "metabolic" &&
    plan.is_extended_fast &&
    (ctx.currentLevel < 5 || ctx.last7DayAvgScore < 80 || ctx.needsSupportDaysLast14 > 1)
  ) {
    return {
      planId: plan.id,
      isVisible: true,
      isAccessible: false,
      lockReason: "stability_locked",
      lockMessage: "Locked — requires Level 5+, Strong scores, and stability",
      isCoachApproved: false,
      isOptionalTool,
    };
  }

  // ── Metabolic: >18h locked unless Level 4+ and Strong 7-day
  if (
    ctx.engineMode === "metabolic" &&
    plan.plan_type === "fasting" &&
    plan.intensity_tier === "high" &&
    (ctx.currentLevel < 4 || ctx.scoreStatus !== "strong")
  ) {
    return {
      planId: plan.id,
      isVisible: true,
      isAccessible: false,
      lockReason: "stability_locked",
      lockMessage: "Locked — requires Level 4+ with Strong status",
      isCoachApproved: false,
      isOptionalTool,
    };
  }

  // ── Performance: high intensity locked if sleep is lowest and not strong
  if (
    ctx.engineMode === "performance" &&
    (plan.intensity_tier === "high" || plan.intensity_tier === "extreme") &&
    ctx.lowestFactor === "sleep" &&
    ctx.scoreStatus !== "strong"
  ) {
    return {
      planId: plan.id,
      isVisible: true,
      isAccessible: false,
      lockReason: "stability_locked",
      lockMessage: "Temporarily locked — sleep recovery needed",
      isCoachApproved: false,
      isOptionalTool,
    };
  }

  // ── Plan is accessible
  return {
    planId: plan.id,
    isVisible: true,
    isAccessible: true,
    lockReason: null,
    lockMessage: null,
    isCoachApproved: false,
    isOptionalTool,
  };
}
