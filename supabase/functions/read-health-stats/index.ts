// @ts-nocheck — Deno edge function; not part of the app's TS build
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge function that reads health_data and health_connections using the
 * service-role key, completely bypassing RLS.
 *
 * This solves the problem where a trainer impersonating a client on a native
 * device can write data (via sync-health-insert) but cannot **read** it
 * because the Supabase client carries the trainer's JWT and the "client can
 * view own" RLS policy requires auth.uid() = client_id.
 *
 * Query params (passed in JSON body):
 *   client_id  – required
 *   mode       – "stats" | "connections" | "data" (default: "stats")
 *   data_type  – optional filter for "data" mode
 *   days       – how far back to query (default: 7)
 */

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth: make sure the caller is logged in ──────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // ── Parse body ───────────────────────────────────────────────────────
    const body = await req.json();
    const clientId: string = body.client_id;
    const mode: string = body.mode ?? "stats";
    const dataType: string | undefined = body.data_type;
    const days: number = body.days ?? 7;
    // Timezone offset in minutes (e.g. -330 for IST = UTC+5:30)
    const tzOffsetMin: number = body.tz_offset ?? 0;

    if (!clientId) throw new Error("Missing client_id");

    console.log(
      `[read-health-stats] caller=${user.id} client=${clientId} mode=${mode} days=${days} tz_offset=${tzOffsetMin}`
    );

    // ── Authorisation check ─────────────────────────────────────────────
    // Caller must be the client themselves OR an assigned trainer.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (user.id !== clientId) {
      const { data: assignment } = await admin
        .from("trainer_clients")
        .select("id")
        .eq("trainer_id", user.id)
        .eq("client_id", clientId)
        .maybeSingle();

      if (!assignment) {
        console.error(
          "[read-health-stats] FORBIDDEN: user",
          user.id,
          "is not assigned to client",
          clientId
        );
        throw new Error("Not authorized for this client");
      }
    }

    console.log(
      `[read-health-stats] user=${user.id} client=${clientId} mode=${mode} days=${days}`
    );

    // ── Connections ─────────────────────────────────────────────────────
    if (mode === "connections") {
      const { data, error } = await admin
        .from("health_connections")
        .select("*")
        .eq("client_id", clientId);

      if (error) {
        console.error("[read-health-stats] connections query error:", error);
        throw error;
      }

      return json({ connections: data });
    }

    // ── Raw data ────────────────────────────────────────────────────────
    const since = new Date();
    since.setDate(since.getDate() - days);

    if (mode === "data") {
      let query = admin
        .from("health_data")
        .select("*")
        .eq("client_id", clientId)
        .gte("recorded_at", since.toISOString())
        .order("recorded_at", { ascending: false });

      if (dataType) query = query.eq("data_type", dataType);

      const { data, error } = await query;
      if (error) {
        console.error("[read-health-stats] data query error:", error);
        throw error;
      }

      return json({ data, count: data?.length ?? 0 });
    }

    // ── Stats (default) ─────────────────────────────────────────────────
    // Compute "midnight local" using the client's timezone offset so that
    // "today's stats" match what the user sees on their device, not UTC.
    const nowMs = Date.now();
    const localNowMs = nowMs + tzOffsetMin * 60_000;
    const localMidnight = new Date(localNowMs);
    localMidnight.setUTCHours(0, 0, 0, 0);            // midnight in "local" day
    const todayISO = new Date(localMidnight.getTime() - tzOffsetMin * 60_000).toISOString();

    console.log(
      `[read-health-stats] stats: tz_offset=${tzOffsetMin} todayISO=${todayISO}`
    );

    const { data: todayData, error: todayErr } = await admin
      .from("health_data")
      .select("*")
      .eq("client_id", clientId)
      .gte("recorded_at", todayISO);

    if (todayErr) {
      console.error("[read-health-stats] stats query error:", todayErr);
      throw todayErr;
    }

    const rows = todayData ?? [];

    // Sum steps & calories across hour buckets.
    // Each DB row should hold the correct per-hour total after sync.
    // MAX within each hour handles legacy rows that weren't re-synced yet.
    function dedupeMaxPerHour(
      items: { value: number; recorded_at: string }[]
    ): number {
      const byHour = new Map<string, number>();
      for (const r of items) {
        const d = new Date(r.recorded_at);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
        byHour.set(key, Math.max(byHour.get(key) ?? 0, Number(r.value)));
      }
      return Array.from(byHour.values()).reduce((s, v) => s + v, 0);
    }

    const steps = rows.filter((d: any) => d.data_type === "steps");
    const cals = rows.filter((d: any) => d.data_type === "calories_burned");
    const hr = rows.filter((d: any) => d.data_type === "heart_rate");
    const rhr = rows.filter((d: any) => d.data_type === "resting_heart_rate");
    const active = rows.filter((d: any) => d.data_type === "active_minutes");
    const workouts = rows.filter((d: any) => d.data_type === "workout");

    const stats = {
      todaySteps: dedupeMaxPerHour(steps),
      todayCalories: dedupeMaxPerHour(cals),
      avgHeartRate:
        hr.length > 0
          ? Math.round(
              hr.reduce((s: number, d: any) => s + Number(d.value), 0) /
                hr.length
            )
          : 0,
      restingHeartRate:
        rhr.length > 0 ? Math.round(Number(rhr[rhr.length - 1].value)) : 0,
      activeMinutes: active.reduce(
        (s: number, d: any) => s + Number(d.value),
        0
      ),
      workoutsCount: workouts.length,
    };

    // Also return row count for debugging
    const totalAllTime = await admin
      .from("health_data")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId);

    console.log(
      `[read-health-stats] today rows=${rows.length} allTime=${totalAllTime.count} stats=${JSON.stringify(stats)}`
    );

    return json({
      stats,
      todayRows: rows.length,
      allTimeCount: totalAllTime.count ?? 0,
    });
  } catch (error: any) {
    console.error("[read-health-stats] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
};

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

serve(handler);
