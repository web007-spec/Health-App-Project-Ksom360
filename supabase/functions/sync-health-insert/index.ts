import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HealthDataPoint {
  data_type: string;
  value: number;
  unit: string;
  recorded_at: string;
  source: string;
  metadata?: Record<string, unknown>;
}

interface SyncRequest {
  client_id: string;
  provider: string;
  health_data: HealthDataPoint[];
  permissions: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify caller is authenticated
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { client_id, provider, health_data, permissions }: SyncRequest = await req.json();

    if (!client_id || !provider || !health_data) {
      throw new Error("Missing required fields: client_id, provider, health_data");
    }

    // Use service role to bypass RLS
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Verify: caller must be the client themselves OR a trainer assigned to this client
    if (user.id !== client_id) {
      const { data: assignment, error: assignErr } = await adminClient
        .from("trainer_clients")
        .select("id")
        .eq("trainer_id", user.id)
        .eq("client_id", client_id)
        .maybeSingle();

      if (assignErr || !assignment) {
        console.error("Authorization check failed:", assignErr, "user:", user.id, "client:", client_id);
        throw new Error("Not authorized: you are not assigned to this client");
      }
    }

    console.log(`[sync-health-insert] user=${user.id} client=${client_id} provider=${provider} points=${health_data.length}`);

    // Upsert health_connections
    const { error: connError } = await adminClient
      .from("health_connections")
      .upsert({
        client_id,
        provider,
        is_connected: true,
        last_sync_at: new Date().toISOString(),
        permissions: permissions || ["heart_rate", "steps", "calories"],
      }, { onConflict: "client_id,provider" });

    if (connError) {
      console.error("[sync-health-insert] health_connections upsert error:", connError);
    }

    // Upsert health_data
    let insertedCount = 0;
    if (health_data.length > 0) {
      const rows = health_data.map((point) => ({
        client_id,
        data_type: point.data_type,
        value: point.value,
        unit: point.unit,
        recorded_at: point.recorded_at,
        source: point.source,
        metadata: point.metadata || null,
      }));

      const { error: dataError } = await adminClient
        .from("health_data")
        .upsert(rows, { onConflict: "client_id,data_type,recorded_at" });

      if (dataError) {
        console.error("[sync-health-insert] health_data upsert error:", dataError);
        throw new Error(`Failed to insert health data: ${dataError.message}`);
      }

      insertedCount = rows.length;
    }

    // Update last_sync_at
    await adminClient
      .from("health_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("client_id", client_id)
      .eq("provider", provider);

    return new Response(
      JSON.stringify({ success: true, count: insertedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[sync-health-insert] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
};

serve(handler);
