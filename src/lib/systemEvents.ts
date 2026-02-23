import { supabase } from "@/integrations/supabase/client";

export type SystemEventType =
  | "engine_switch"
  | "level_advancement"
  | "level_advancement_blocked"
  | "manual_override"
  | "parent_link_created"
  | "parent_link_revoked"
  | "recommendation_suppressed"
  | "score_incomplete_data"
  | "nudge_suppressed";

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
