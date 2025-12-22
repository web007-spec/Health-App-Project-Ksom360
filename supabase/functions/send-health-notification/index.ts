import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthNotificationPayload {
  client_id: string;
  notification_type: 'health_sync' | 'low_activity' | 'heart_rate_alert';
  data?: {
    steps?: number;
    calories?: number;
    heart_rate?: number;
    provider?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: HealthNotificationPayload = await req.json();
    const { client_id, notification_type, data } = payload;

    console.log('Processing health notification:', { client_id, notification_type, data });

    // Get the client's profile
    const { data: clientProfile, error: clientError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', client_id)
      .single();

    if (clientError) {
      console.error('Error fetching client profile:', clientError);
      throw new Error('Client not found');
    }

    // Get the trainer(s) assigned to this client
    const { data: trainerClients, error: trainerError } = await supabase
      .from('trainer_clients')
      .select('trainer_id')
      .eq('client_id', client_id)
      .eq('status', 'active');

    if (trainerError) {
      console.error('Error fetching trainer clients:', trainerError);
      throw new Error('Failed to find trainers for client');
    }

    if (!trainerClients || trainerClients.length === 0) {
      console.log('No active trainers found for client');
      return new Response(
        JSON.stringify({ message: 'No trainers to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trainerIds = trainerClients.map(tc => tc.trainer_id);

    // Get trainer notification preferences
    const { data: preferences, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('user_id, push_enabled, health_sync_alerts, low_activity_alerts, activity_threshold_steps, activity_threshold_calories, push_subscription')
      .in('user_id', trainerIds);

    if (prefsError) {
      console.error('Error fetching notification preferences:', prefsError);
    }

    // Generate notification message based on type
    let message = '';
    let shouldNotify = false;
    const clientName = clientProfile.full_name || 'Your client';

    switch (notification_type) {
      case 'health_sync':
        message = `${clientName} just synced their health data. Steps: ${data?.steps?.toLocaleString() || 0}, Calories: ${data?.calories || 0} kcal`;
        break;
      
      case 'low_activity':
        message = `${clientName} has low activity today. Steps: ${data?.steps?.toLocaleString() || 0}, Calories: ${data?.calories || 0} kcal`;
        break;
      
      case 'heart_rate_alert':
        const hrStatus = (data?.heart_rate || 0) > 100 ? 'elevated' : 'low';
        message = `${clientName} has ${hrStatus} heart rate: ${data?.heart_rate} bpm`;
        break;
    }

    // Insert notifications for each trainer
    const notifications = [];
    
    for (const trainerId of trainerIds) {
      const trainerPrefs = preferences?.find(p => p.user_id === trainerId);
      
      // Check if trainer wants this type of notification
      if (notification_type === 'health_sync' && trainerPrefs?.health_sync_alerts === false) {
        console.log(`Trainer ${trainerId} has health sync alerts disabled`);
        continue;
      }
      
      if (notification_type === 'low_activity' && trainerPrefs?.low_activity_alerts === false) {
        console.log(`Trainer ${trainerId} has low activity alerts disabled`);
        continue;
      }

      // Check activity thresholds for low_activity type
      if (notification_type === 'low_activity') {
        const stepsThreshold = trainerPrefs?.activity_threshold_steps || 5000;
        const caloriesThreshold = trainerPrefs?.activity_threshold_calories || 300;
        
        if ((data?.steps || 0) >= stepsThreshold && (data?.calories || 0) >= caloriesThreshold) {
          console.log(`Client activity above threshold for trainer ${trainerId}`);
          continue;
        }
      }

      notifications.push({
        trainer_id: trainerId,
        client_id: client_id,
        notification_type: notification_type,
        message: message,
      });

      // If trainer has push enabled and subscription, send web push
      if (trainerPrefs?.push_enabled && trainerPrefs?.push_subscription) {
        console.log(`Would send push notification to trainer ${trainerId}`);
        // Note: Web Push requires VAPID keys which would need to be set up
        // For now, we're storing the notification in the database for in-app display
      }
    }

    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from('health_notifications')
        .insert(notifications);

      if (insertError) {
        console.error('Error inserting notifications:', insertError);
        throw new Error('Failed to create notifications');
      }

      console.log(`Created ${notifications.length} health notifications`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${notifications.length} notifications`,
        notifications_created: notifications.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in send-health-notification:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
