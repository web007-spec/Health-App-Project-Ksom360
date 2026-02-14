import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = user.id;
    const now = new Date();
    const healthData: any[] = [];

    // Generate 7 days of realistic health data
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);
      const dateStr = date.toISOString().split("T")[0];

      // Steps - varying throughout the day
      const dailySteps = 5000 + Math.floor(Math.random() * 8000);
      healthData.push({
        client_id: clientId,
        data_type: "steps",
        value: dailySteps,
        unit: "count",
        recorded_at: `${dateStr}T18:00:00Z`,
        source: "apple_health",
      });

      // Calories burned
      const dailyCals = 250 + Math.floor(Math.random() * 450);
      healthData.push({
        client_id: clientId,
        data_type: "calories_burned",
        value: dailyCals,
        unit: "kcal",
        recorded_at: `${dateStr}T18:00:00Z`,
        source: "apple_health",
      });

      // Heart rate readings (multiple per day)
      const hrReadings = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < hrReadings; i++) {
        const hour = 8 + Math.floor((i / hrReadings) * 14);
        const hr = 62 + Math.floor(Math.random() * 40);
        healthData.push({
          client_id: clientId,
          data_type: "heart_rate",
          value: hr,
          unit: "bpm",
          recorded_at: `${dateStr}T${String(hour).padStart(2, "0")}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}:00Z`,
          source: "apple_health",
        });
      }

      // Resting heart rate (one per day)
      const restingHr = 55 + Math.floor(Math.random() * 12);
      healthData.push({
        client_id: clientId,
        data_type: "resting_heart_rate",
        value: restingHr,
        unit: "bpm",
        recorded_at: `${dateStr}T07:00:00Z`,
        source: "apple_health",
      });

      // Active minutes
      const activeMins = 15 + Math.floor(Math.random() * 60);
      healthData.push({
        client_id: clientId,
        data_type: "active_minutes",
        value: activeMins,
        unit: "min",
        recorded_at: `${dateStr}T18:00:00Z`,
        source: "apple_health",
      });

      // Workouts (some days)
      if (Math.random() > 0.4) {
        healthData.push({
          client_id: clientId,
          data_type: "workout",
          value: 30 + Math.floor(Math.random() * 45),
          unit: "min",
          recorded_at: `${dateStr}T${10 + Math.floor(Math.random() * 8)}:00:00Z`,
          source: "apple_health",
          metadata: { workout_type: ["Running", "Strength Training", "HIIT", "Cycling"][Math.floor(Math.random() * 4)] },
        });
      }
    }

    // Delete existing demo data for this client first
    await supabase
      .from("health_data")
      .delete()
      .eq("client_id", clientId)
      .eq("source", "apple_health");

    // Insert all health data
    const { error: insertError } = await supabase
      .from("health_data")
      .insert(healthData);

    if (insertError) throw insertError;

    // Upsert health connection to show as connected
    await supabase
      .from("health_connections")
      .upsert({
        client_id: clientId,
        provider: "apple_health",
        is_connected: true,
        last_sync_at: now.toISOString(),
        permissions: ["heart_rate", "steps", "calories", "workouts", "active_minutes"],
      }, { onConflict: "client_id,provider" });

    return new Response(
      JSON.stringify({ success: true, count: healthData.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
