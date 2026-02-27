import { supabase } from "@/integrations/supabase/client";
import type { SubscriptionTier } from "@/lib/featureAccessGuard";
import type { EngineMode } from "@/lib/engineConfig";

export type SystemEventType =
  | "engine_switch"
  | "level_advancement"
  | "level_advancement_blocked"
  | "manual_override"
  | "parent_link_created"
  | "parent_link_revoked"
  | "recommendation_suppressed"
  | "score_incomplete_data"
  | "nudge_suppressed"
  | "authority_blocked";

export async function logSystemEvent(
  eventType: SystemEventType,
  clientId: string,
  coachId: string | null,
  details: Record<string, any> = {},
) {
  await supabase.from("system_events").insert({
    event_type: eventType,
    client_id: clientId,
    coach_id: coachId,
    details,
  } as any);
}

/**
 * Log an authority-blocked automation attempt with full context.
 */
export async function logAuthorityBlocked(
  clientId: string,
  actionType: string,
  engine: EngineMode,
  tier: SubscriptionTier,
  toggleState: Record<string, boolean>,
) {
  await logSystemEvent("authority_blocked", clientId, null, {
    action_type: actionType,
    engine_mode: engine,
    tier,
    authority_toggle_state: toggleState,
  });
}
