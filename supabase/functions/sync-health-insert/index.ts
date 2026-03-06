// @ts-nocheck — Deno edge function; not part of the app's TS build
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller identity with anon client
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { client_id, provider, health_data, permissions } = await req.json();

    if (!client_id || !provider || !Array.isArray(health_data)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to bypass RLS (trainer impersonation scenario)
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Upsert health connection
    const { error: connError } = await admin
      .from("health_connections")
      .upsert(
        {
          client_id,
          provider,
          is_connected: true,
          last_sync_at: new Date().toISOString(),
          permissions: permissions || [],
        },
        { onConflict: "client_id,provider" }
      );

    if (connError) {
      console.error("[sync-health-insert] health_connections error:", connError);
    }

    // Upsert health data points
    let insertedCount = 0;
    if (health_data.length > 0) {
      const rows = health_data.map((point: any) => ({
        client_id,
        data_type: point.data_type,
        value: point.value,
        unit: point.unit,
        recorded_at: point.recorded_at,
        source: point.source,
        metadata: point.metadata || null,
      }));

      // Batch in chunks of 500 to avoid payload limits
      const BATCH_SIZE = 500;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error } = await admin
          .from("health_data")
          .upsert(batch, { onConflict: "client_id,data_type,recorded_at" });

        if (error) {
          console.error(`[sync-health-insert] health_data batch ${i} error:`, error);
        } else {
          insertedCount += batch.length;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, inserted: insertedCount }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("[sync-health-insert] unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
