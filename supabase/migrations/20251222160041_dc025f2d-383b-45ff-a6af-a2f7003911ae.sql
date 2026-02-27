-- Add health notification preferences to notification_preferences table
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS health_sync_alerts BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS low_activity_alerts BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS activity_threshold_steps INTEGER DEFAULT 5000,
ADD COLUMN IF NOT EXISTS activity_threshold_calories INTEGER DEFAULT 300;

-- Create health_notifications table to track sent notifications and prevent duplicates
CREATE TABLE IF NOT EXISTS public.health_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'health_sync', 'low_activity', 'heart_rate_alert'
  message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.health_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for health_notifications
CREATE POLICY "Trainers can view their own health notifications" 
ON public.health_notifications 
FOR SELECT 
USING (auth.uid() = trainer_id);

CREATE POLICY "System can insert health notifications" 
ON public.health_notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Trainers can update their own notifications" 
ON public.health_notifications 
FOR UPDATE 
USING (auth.uid() = trainer_id);

-- Enable realtime for health_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.health_notifications;