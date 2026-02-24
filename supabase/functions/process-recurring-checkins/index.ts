import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();

    // Fetch active schedules that are due
    const { data: schedules, error: schedErr } = await supabase
      .from("recurring_checkin_schedules")
      .select("*")
      .eq("is_active", true)
      .or(`next_trigger_at.is.null,next_trigger_at.lte.${now.toISOString()}`);

    if (schedErr) throw schedErr;
    if (!schedules || schedules.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const schedule of schedules) {
      // Create the client task
      const taskData: Record<string, unknown> = {
        client_id: schedule.client_id,
        trainer_id: schedule.trainer_id,
        name: schedule.schedule_name,
        task_type: "form",
        due_date: now.toISOString().split("T")[0],
        description: `Scheduled ${schedule.schedule_type} — auto-created`,
      };

      // If there's a template, copy its form questions
      if (schedule.template_id) {
        const { data: template } = await supabase
          .from("task_templates")
          .select("name, task_type, description, form_questions")
          .eq("id", schedule.template_id)
          .maybeSingle();

        if (template) {
          taskData.name = template.name;
          taskData.task_type = template.task_type;
          taskData.description = template.description;
          taskData.template_id = schedule.template_id;
          if (template.form_questions) {
            taskData.attachments = template.form_questions;
          }
        }
      }

      const { data: newTask, error: taskErr } = await supabase
        .from("client_tasks")
        .insert(taskData)
        .select("id")
        .single();

      if (taskErr) {
        console.error("Failed to create task for schedule", schedule.id, taskErr);
        continue;
      }

      // Calculate next trigger
      const nextTrigger = calculateNextTrigger(schedule, now);

      await supabase
        .from("recurring_checkin_schedules")
        .update({
          last_triggered_at: now.toISOString(),
          next_trigger_at: nextTrigger.toISOString(),
        })
        .eq("id", schedule.id);

      processed++;
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Process recurring checkins error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function calculateNextTrigger(schedule: Record<string, unknown>, from: Date): Date {
  const next = new Date(from);
  const freq = schedule.frequency as string;

  switch (freq) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "biweekly":
      next.setDate(next.getDate() + 14);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      if (schedule.day_of_month) {
        next.setDate(Math.min(schedule.day_of_month as number, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
      }
      break;
    default:
      next.setDate(next.getDate() + 7);
  }

  // Set time_of_day
  if (schedule.time_of_day) {
    const [h, m] = (schedule.time_of_day as string).split(":").map(Number);
    next.setHours(h, m, 0, 0);
  }

  return next;
}
