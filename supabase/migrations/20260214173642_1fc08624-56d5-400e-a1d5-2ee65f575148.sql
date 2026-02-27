
-- Create client_habits table for recurring habit assignments
CREATE TABLE public.client_habits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  trainer_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  goal_value INTEGER NOT NULL DEFAULT 1,
  goal_unit TEXT NOT NULL DEFAULT 'times',
  frequency TEXT NOT NULL DEFAULT 'daily', -- 'daily' or 'weekly'
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_time TIME DEFAULT '08:00',
  comments_enabled BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  template_id UUID REFERENCES public.task_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create habit_completions table for tracking daily/weekly completions
CREATE TABLE public.habit_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID NOT NULL REFERENCES public.client_habits(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  completion_date DATE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE(habit_id, completion_date)
);

-- Add habit-specific fields to task_templates
ALTER TABLE public.task_templates
  ADD COLUMN IF NOT EXISTS goal_value INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS goal_unit TEXT DEFAULT 'times',
  ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'daily';

-- Enable RLS
ALTER TABLE public.client_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;

-- RLS for client_habits
CREATE POLICY "Trainers can manage their client habits"
  ON public.client_habits FOR ALL
  USING (auth.uid() = trainer_id);

CREATE POLICY "Clients can view their habits"
  ON public.client_habits FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can update their habits"
  ON public.client_habits FOR UPDATE
  USING (auth.uid() = client_id);

-- RLS for habit_completions
CREATE POLICY "Clients can manage their habit completions"
  ON public.habit_completions FOR ALL
  USING (auth.uid() = client_id);

CREATE POLICY "Trainers can view client habit completions"
  ON public.habit_completions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.client_habits ch
    WHERE ch.id = habit_completions.habit_id
    AND ch.trainer_id = auth.uid()
  ));

-- Triggers for updated_at
CREATE TRIGGER update_client_habits_updated_at
  BEFORE UPDATE ON public.client_habits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
