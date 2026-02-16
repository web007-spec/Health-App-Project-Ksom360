
-- Create a table for client reminders (game stats, workouts, habits, tasks)
CREATE TABLE public.client_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  reminder_type TEXT NOT NULL, -- 'game_stats', 'workout', 'habit', 'task', 'custom'
  title TEXT NOT NULL,
  description TEXT,
  reference_id UUID, -- ID of the related entity (sport_event_id, workout_id, etc.)
  remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_reminders ENABLE ROW LEVEL SECURITY;

-- Clients can manage their own reminders
CREATE POLICY "Clients can manage their reminders"
ON public.client_reminders
FOR ALL
USING (auth.uid() = client_id)
WITH CHECK (auth.uid() = client_id);

-- Trainers can view client reminders
CREATE POLICY "Trainers can view client reminders"
ON public.client_reminders
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM trainer_clients tc
  WHERE tc.client_id = client_reminders.client_id AND tc.trainer_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_client_reminders_updated_at
BEFORE UPDATE ON public.client_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
