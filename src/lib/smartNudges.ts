import { supabase } from "@/integrations/supabase/client";

// Engine-specific nudge templates
const NUDGE_TEMPLATES: Record<string, Record<string, { title: string; body: string }[]>> = {
  metabolic: {
    fasting: [
      { title: "Maintain your fasting window today.", body: "Stability improves when timing stays consistent." },
      { title: "Your fasting window is active.", body: "Stay consistent to reinforce metabolic regulation." },
    ],
    fasting_break: [
      { title: "Time to break your fast.", body: "Log your meal to stay on track within your eating window." },
    ],
    sleep: [
      { title: "Prioritize sleep tonight.", body: "Sleep quality directly affects metabolic response." },
      { title: "Begin your wind-down routine.", body: "Consistent sleep timing reinforces stability." },
    ],
    checkin: [
      { title: "Complete your daily check-in.", body: "Tracking inputs supports accurate recommendations." },
    ],
    workout: [
      { title: "Complete today's session.", body: "Consistency compounds over time." },
    ],
    recovery: [
      { title: "Recovery supports your next session.", body: "Light movement and hydration improve readiness." },
    ],
  },
  performance: {
    workout: [
      { title: "Complete today's training to reinforce progress.", body: "Adaptation requires consistent execution." },
      { title: "Your scheduled session is waiting.", body: "Full weekly execution accelerates results." },
    ],
    sleep: [
      { title: "Recovery quality determines performance output.", body: "Prioritize 7+ hours tonight." },
      { title: "Begin your wind-down routine.", body: "Sleep fuels tomorrow's training capacity." },
    ],
    fasting: [
      { title: "Nutritional timing should support training energy.", body: "Maintain your planned fasting structure." },
    ],
    checkin: [
      { title: "Log today's inputs.", body: "Complete data improves your recommendations." },
    ],
    recovery: [
      { title: "Recovery first if readiness is moderate.", body: "Add light mobility or reduce load if fatigue is elevated." },
    ],
  },
  athletic: {
    workout: [
      { title: "Complete your scheduled training.", body: "Consistency builds competitive advantage." },
      { title: "Finish today's reps with focus.", body: "Preparation is the foundation of performance." },
    ],
    sleep: [
      { title: "Prioritize sleep tonight for better performance tomorrow.", body: "Sleep fuels speed and reaction time." },
      { title: "Rest up before tomorrow's event.", body: "Game readiness depends on recovery." },
    ],
    recovery: [
      { title: "Hydrate and recover.", body: "Practice readiness depends on it." },
      { title: "Stretch, hydrate, and protect your body.", body: "Recovery habits prevent injury." },
    ],
    checkin: [
      { title: "Log your daily check-in.", body: "Your coach uses this to plan your training." },
    ],
    hydration: [
      { title: "Stay hydrated throughout the day.", body: "Proper hydration supports power and endurance." },
    ],
  },
};

export type NudgeType = "checkin" | "workout" | "fasting" | "fasting_break" | "sleep" | "recovery" | "hydration";

interface NudgeContext {
  engineMode: string;
  lowestFactor?: string;
  scoreStatus?: string;
  fastingEnabled?: boolean;
}

export function selectNudge(type: NudgeType, ctx: NudgeContext): { title: string; body: string } | null {
  const engine = ctx.engineMode || "performance";
  const templates = NUDGE_TEMPLATES[engine]?.[type];
  if (!templates || templates.length === 0) return null;
  return templates[Math.floor(Math.random() * templates.length)];
}

export function getApplicableNudgeTypes(ctx: NudgeContext): NudgeType[] {
  const types: NudgeType[] = ["checkin", "workout", "sleep", "recovery"];

  if (ctx.engineMode === "athletic") {
    types.push("hydration");
    // No fasting for athletic
  } else {
    if (ctx.engineMode === "performance" && !ctx.fastingEnabled) {
      // Fasting optional, don't nudge
    } else {
      types.push("fasting");
    }
  }

  return types;
}

// Check if client has been Strong for 3 consecutive days (suppress nudges)
export async function isConsecutiveStrong(userId: string): Promise<boolean> {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("recommendation_events")
    .select("status")
    .eq("client_id", userId)
    .gte("created_at", threeDaysAgo)
    .order("created_at", { ascending: false })
    .limit(3);

  if (!data || data.length < 3) return false;
  return data.every((e) => (e.status || "").toLowerCase().includes("strong"));
}

// Check if parent link is active for athletic minor (suppress non-performance nudges)
export async function hasActiveParentLink(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("client_feature_settings")
    .select("is_minor, engine_mode, parent_link_enabled")
    .eq("client_id", userId)
    .maybeSingle();

  return !!(data?.is_minor && data?.engine_mode === "athletic" && data?.parent_link_enabled);
}

// Types that are allowed even with parent link active
const PARENT_LINK_ALLOWED_TYPES: NudgeType[] = ["workout", "recovery", "hydration"];

// Frequency limits
const FREQUENCY_LIMITS: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

export function getMaxNudgesPerDay(frequency: string): number {
  return FREQUENCY_LIMITS[frequency] || 2;
}

// Check if current time is within quiet hours
export function isQuietHours(start: string, end: string): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  // Overnight quiet hours (e.g. 22:00 - 07:00)
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

// Check suppression (dismissed 3+ times in 7 days)
export async function shouldSuppressNudge(
  userId: string,
  type: string
): Promise<boolean> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("notification_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", type)
    .not("dismissed_at", "is", null)
    .gte("sent_at", sevenDaysAgo);

  return (count || 0) >= 3;
}

// Check recent completion (within 60 minutes)
export async function wasRecentlyCompleted(
  userId: string,
  type: string
): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("notification_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", type)
    .not("opened_at", "is", null)
    .gte("opened_at", oneHourAgo);

  return (count || 0) > 0;
}

// Count today's sent nudges
export async function getTodayNudgeCount(userId: string): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("notification_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("sent_at", todayStart.toISOString())
    .is("suppression_reason", null);

  return count || 0;
}

// Log a sent notification
export async function logNotification(
  userId: string,
  engineMode: string,
  type: string,
  title: string,
  body?: string,
  suppressionReason?: string
) {
  await supabase.from("notification_events").insert({
    user_id: userId,
    engine_mode: engineMode,
    type,
    title,
    body: body || null,
    suppression_reason: suppressionReason || null,
  });
}

/**
 * Comprehensive nudge suppression check combining all safety rules.
 * Returns a suppression reason string, or null if the nudge should be sent.
 */
export async function checkNudgeSuppression(
  userId: string,
  type: NudgeType,
  ctx: NudgeContext,
  quietStart: string,
  quietEnd: string,
  maxPerDay: number,
): Promise<string | null> {
  // 1. Quiet hours
  if (isQuietHours(quietStart, quietEnd)) return "quiet_hours";

  // 2. Frequency limit
  const todayCount = await getTodayNudgeCount(userId);
  if (todayCount >= maxPerDay) return "frequency_limit";

  // 3. Dismissed 3x in 7 days
  const suppressed = await shouldSuppressNudge(userId, type);
  if (suppressed) return "dismissed_3x_in_7d";

  // 4. Recently completed (within 60 min)
  const recent = await wasRecentlyCompleted(userId, type);
  if (recent) return "recently_completed";

  // 5. Strong for 3 consecutive days — suppress all nudges
  const strong3 = await isConsecutiveStrong(userId);
  if (strong3) return "consecutive_strong_3d";

  // 6. Parent link active — suppress non-performance nudges for athletic minors
  const parentLink = await hasActiveParentLink(userId);
  if (parentLink && !PARENT_LINK_ALLOWED_TYPES.includes(type)) {
    return "parent_link_active";
  }

  return null;
}
