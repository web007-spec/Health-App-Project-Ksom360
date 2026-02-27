import { supabase } from "@/integrations/supabase/client";
import { logSystemEvent } from "@/lib/systemEvents";
import type { EngineMode } from "@/lib/engineConfig";

/**
 * Safely switch a client's engine mode with full safeguards:
 * - Archives previous engine scoring history (via system_events log)
 * - Resets level to Foundation (Level 1)
 * - Clears pending plan suggestions
 * - Resets engine-specific fields
 * - Prevents cross-engine contamination
 */
export async function switchEngineMode(
  clientId: string,
  coachId: string,
  newMode: EngineMode,
  previousMode: EngineMode,
) {
  if (newMode === previousMode) return;

  // 1) Log the engine switch event (archives context)
  await logSystemEvent("engine_switch", clientId, coachId, {
    previous_engine: previousMode,
    new_engine: newMode,
    switched_at: new Date().toISOString(),
  });

  // 2) Reset level, clear suggestions, update engine in feature settings
  const resetPayload: Record<string, any> = {
    engine_mode: newMode,
    current_level: 1,
    level_start_date: new Date().toISOString().split("T")[0],
    level_completion_pct: 0,
    level_status: "active",
    level_blocked_reason: null,
    last_engine_switch_at: new Date().toISOString(),
    // Clear pending protocol/plan suggestions
    selected_protocol_id: null,
    protocol_completed: false,
    protocol_start_date: null,
    protocol_assigned_by: null,
    selected_quick_plan_id: null,
  };

  // Engine-specific field resets
  if (newMode === "athletic") {
    // Athletic: no fasting
    resetPayload.fasting_enabled = false;
    resetPayload.fasting_strict_mode = false;
    resetPayload.active_fast_start_at = null;
    resetPayload.active_fast_target_hours = null;
    resetPayload.nudge_fasting = false;
  }

  await supabase
    .from("client_feature_settings")
    .update(resetPayload as any)
    .eq("client_id", clientId);

  // 3) Update profiles table engine_mode
  await supabase
    .from("profiles")
    .update({ engine_mode: newMode as any })
    .eq("id", clientId);

  // 4) Dismiss any pending recommendation suggestions
  await supabase
    .from("recommendation_events")
    .update({ dismissed: true } as any)
    .eq("client_id", clientId)
    .not("plan_suggestion_type", "is", null)
    .is("coach_approved", null)
    .is("dismissed", null);
}
