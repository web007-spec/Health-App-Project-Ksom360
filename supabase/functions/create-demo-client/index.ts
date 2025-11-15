import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Create demo client user
    const demoEmail = `demo.client.${Date.now()}@fittrainer.app`;
    const demoPassword = 'DemoClient123!';

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'Demo Client',
        role: 'client'
      }
    });

    if (createError) throw createError;

    // Connect client to trainer
    const { error: relationError } = await supabaseAdmin
      .from('trainer_clients')
      .insert({
        trainer_id: user.id,
        client_id: newUser.user.id,
        status: 'active'
      });

    if (relationError) throw relationError;

    // Get some workout plans to assign
    const { data: workoutPlans } = await supabaseAdmin
      .from('workout_plans')
      .select('id')
      .eq('trainer_id', user.id)
      .limit(3);

    // Assign workouts to the client
    if (workoutPlans && workoutPlans.length > 0) {
      const assignments = workoutPlans.map((plan, index) => ({
        client_id: newUser.user.id,
        workout_plan_id: plan.id,
        assigned_by: user.id,
        scheduled_date: new Date(Date.now() + index * 86400000).toISOString().split('T')[0],
        notes: 'Demo workout assignment'
      }));

      await supabaseAdmin
        .from('client_workouts')
        .insert(assignments);
    }

    // Add some progress entries
    await supabaseAdmin
      .from('progress_entries')
      .insert([
        {
          client_id: newUser.user.id,
          weight: 75.5,
          body_fat_percentage: 18.5,
          entry_date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
          notes: 'Starting measurements'
        },
        {
          client_id: newUser.user.id,
          weight: 74.8,
          body_fat_percentage: 17.9,
          entry_date: new Date().toISOString().split('T')[0],
          notes: 'Week 1 progress'
        }
      ]);

    // Add some nutrition logs
    await supabaseAdmin
      .from('nutrition_logs')
      .insert([
        {
          client_id: newUser.user.id,
          meal_name: 'Breakfast',
          calories: 450,
          protein: 30,
          carbs: 45,
          fats: 15,
          log_date: new Date().toISOString().split('T')[0]
        },
        {
          client_id: newUser.user.id,
          meal_name: 'Lunch',
          calories: 600,
          protein: 45,
          carbs: 60,
          fats: 20,
          log_date: new Date().toISOString().split('T')[0]
        }
      ]);

    return new Response(
      JSON.stringify({
        success: true,
        client: {
          email: demoEmail,
          password: demoPassword,
          id: newUser.user.id,
          name: 'Demo Client'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});