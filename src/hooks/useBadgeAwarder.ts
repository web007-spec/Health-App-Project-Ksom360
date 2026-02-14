import { supabase } from "@/integrations/supabase/client";

export async function awardBadges(clientId: string, sessionId: string, workoutDifficulty?: string) {
  // Fetch all badge definitions
  const { data: badges } = await supabase
    .from("badge_definitions")
    .select("*");

  if (!badges) return;

  // Fetch already earned badges
  const { data: earned } = await supabase
    .from("client_badges")
    .select("badge_id")
    .eq("client_id", clientId);

  const earnedIds = new Set(earned?.map((e) => e.badge_id) || []);

  // Fetch completed sessions count
  const { count: totalCompleted } = await supabase
    .from("workout_sessions")
    .select("*", { count: "exact", head: true })
    .eq("client_id", clientId)
    .not("completed_at", "is", null);

  // Fetch advanced workout count
  const { data: advancedSessions } = await supabase
    .from("workout_sessions")
    .select("workout_plan_id")
    .eq("client_id", clientId)
    .not("completed_at", "is", null);

  let advancedCount = 0;
  if (advancedSessions && advancedSessions.length > 0) {
    const planIds = [...new Set(advancedSessions.map((s) => s.workout_plan_id))];
    const { data: plans } = await supabase
      .from("workout_plans")
      .select("id, difficulty")
      .in("id", planIds);
    const advancedPlanIds = new Set(plans?.filter((p) => p.difficulty === "advanced").map((p) => p.id) || []);
    advancedCount = advancedSessions.filter((s) => advancedPlanIds.has(s.workout_plan_id)).length;
  }

  // Calculate streak
  const { data: recentSessions } = await supabase
    .from("workout_sessions")
    .select("completed_at")
    .eq("client_id", clientId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(60);

  let streak = 0;
  if (recentSessions && recentSessions.length > 0) {
    const dates = [...new Set(recentSessions.map((s) => new Date(s.completed_at!).toDateString()))];
    const today = new Date();
    let checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    for (const dateStr of dates) {
      if (new Date(dateStr).toDateString() === checkDate.toDateString()) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Award badges
  const toAward: { badge_id: string; client_id: string; session_id: string }[] = [];

  for (const badge of badges) {
    if (earnedIds.has(badge.id)) continue;

    let qualified = false;
    if (badge.badge_type === "milestone") {
      qualified = (totalCompleted || 0) >= badge.requirement_value;
    } else if (badge.badge_type === "streak") {
      qualified = streak >= badge.requirement_value;
    } else if (badge.badge_type === "difficulty") {
      qualified = advancedCount >= badge.requirement_value;
    }

    if (qualified) {
      toAward.push({ badge_id: badge.id, client_id: clientId, session_id: sessionId });
    }
  }

  if (toAward.length > 0) {
    await supabase.from("client_badges").insert(toAward);
  }

  return toAward.length;
}
