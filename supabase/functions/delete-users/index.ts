import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify trainer is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const trainer = { id: claimsData.claims.sub as string };

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { action, userIds, userId, newPassword } = await req.json();

    // DELETE action
    if (action === "delete" && userId) {
      // Verify trainer owns this client
      const { data: relation } = await supabaseAdmin
        .from("trainer_clients")
        .select("id")
        .eq("trainer_id", trainer.id)
        .eq("client_id", userId)
        .single();

      if (!relation) throw new Error("Client not found or unauthorized");

      // Delete related data first
      const tables = [
        "client_feature_settings", "client_macro_targets", "client_tasks",
        "client_workouts", "client_meal_plan_assignments", "client_recipe_book_assignments",
        "client_collection_access", "client_workout_collection_access",
        "client_goal_countdowns", "fitness_goals", "nutrition_logs",
        "progress_entries", "health_connections", "health_data",
        "health_notifications", "client_badges", "client_notes",
        "client_meal_selections", "client_habits"
      ];

      for (const table of tables) {
        await supabaseAdmin.from(table).delete().eq("client_id", userId);
      }

      // Delete habit completions
      await supabaseAdmin.from("habit_completions").delete().eq("client_id", userId);

      // Delete workout sessions and their logs
      const { data: sessions } = await supabaseAdmin
        .from("workout_sessions")
        .select("id")
        .eq("client_id", userId);

      if (sessions?.length) {
        const sessionIds = sessions.map(s => s.id);
        await supabaseAdmin.from("workout_exercise_logs").delete().in("session_id", sessionIds);
        await supabaseAdmin.from("workout_comments").delete().in("session_id", sessionIds);
        await supabaseAdmin.from("workout_sessions").delete().eq("client_id", userId);
      }

      // Delete conversation memberships and messages
      const { data: memberships } = await supabaseAdmin
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", userId);

      if (memberships?.length) {
        for (const m of memberships) {
          await supabaseAdmin.from("conversation_read_receipts").delete().eq("conversation_id", m.conversation_id).eq("user_id", userId);
        }
        await supabaseAdmin.from("conversation_members").delete().eq("user_id", userId);
      }

      // Delete trainer-client relationship
      await supabaseAdmin.from("trainer_clients").delete().eq("client_id", userId).eq("trainer_id", trainer.id);

      // Delete profile
      await supabaseAdmin.from("profiles").delete().eq("id", userId);

      // Delete auth user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) console.error("Error deleting auth user:", deleteError);

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // RESET PASSWORD action
    if (action === "reset-password" && userId && newPassword) {
      const { data: relation } = await supabaseAdmin
        .from("trainer_clients")
        .select("id")
        .eq("trainer_id", trainer.id)
        .eq("client_id", userId)
        .single();

      if (!relation) throw new Error("Client not found or unauthorized");

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // BULK DELETE (legacy)
    if (userIds?.length) {
      const results = [];
      for (const id of userIds) {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
        results.push({ id, error: error?.message || null });
      }
      return new Response(JSON.stringify({ results }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    throw new Error("Invalid action");
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});