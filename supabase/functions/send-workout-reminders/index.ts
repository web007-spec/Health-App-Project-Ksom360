import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WorkoutReminder {
  client_id: string;
  client_email: string;
  workout_name: string;
  scheduled_date: string;
  category: string;
  duration_minutes: number;
  reminder_hours_before: number;
  email_enabled: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Starting workout reminder check...");

    // Get all notification preferences with email enabled
    const { data: preferences, error: prefsError } = await supabaseClient
      .from("notification_preferences")
      .select("*")
      .eq("email_enabled", true);

    if (prefsError) {
      console.error("Error fetching preferences:", prefsError);
      throw prefsError;
    }

    console.log(`Found ${preferences?.length || 0} users with email notifications enabled`);

    if (!preferences || preferences.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users with email notifications enabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const remindersToSend: WorkoutReminder[] = [];

    // For each user with notifications enabled
    for (const pref of preferences) {
      const hoursAhead = pref.reminder_hours_before || 24;
      const reminderTime = new Date();
      reminderTime.setHours(reminderTime.getHours() + hoursAhead);

      // Find workouts scheduled within the reminder window
      const { data: workouts, error: workoutsError } = await supabaseClient
        .from("client_workouts")
        .select(`
          id,
          scheduled_date,
          completed_at,
          client_id,
          workout_plans (
            name,
            category,
            duration_minutes
          )
        `)
        .eq("client_id", pref.user_id)
        .is("completed_at", null)
        .gte("scheduled_date", new Date().toISOString().split("T")[0])
        .lte("scheduled_date", reminderTime.toISOString().split("T")[0]);

      if (workoutsError) {
        console.error(`Error fetching workouts for user ${pref.user_id}:`, workoutsError);
        continue;
      }

      // Get user profile for email
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("email, full_name")
        .eq("id", pref.user_id)
        .single();

      if (workouts && workouts.length > 0 && profile) {
        for (const workout of workouts) {
          const workoutPlan = Array.isArray(workout.workout_plans) 
            ? workout.workout_plans[0] 
            : workout.workout_plans;
            
          if (workoutPlan) {
            remindersToSend.push({
              client_id: pref.user_id,
              client_email: profile.email,
              workout_name: workoutPlan.name,
              scheduled_date: workout.scheduled_date,
              category: workoutPlan.category,
              duration_minutes: workoutPlan.duration_minutes,
              reminder_hours_before: hoursAhead,
              email_enabled: pref.email_enabled,
            });
          }
        }
      }
    }

    console.log(`Found ${remindersToSend.length} workout reminders to send`);

    // Here you would integrate with your email service (Resend, SendGrid, etc.)
    // For now, we'll just log the reminders that would be sent
    const results = remindersToSend.map((reminder) => ({
      to: reminder.client_email,
      workout: reminder.workout_name,
      scheduled: reminder.scheduled_date,
      status: "Email service not configured - would send here",
    }));

    console.log("Reminder results:", JSON.stringify(results, null, 2));

    // To actually send emails, you would need to:
    // 1. Add RESEND_API_KEY secret
    // 2. Import and use Resend library
    // 3. Send emails using resend.emails.send()

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${remindersToSend.length} workout reminders`,
        reminders: results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-workout-reminders:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
