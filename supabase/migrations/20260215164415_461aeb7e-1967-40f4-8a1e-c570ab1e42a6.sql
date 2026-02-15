
-- Create table for custom exercise options (muscle groups, equipment, categories)
CREATE TABLE public.exercise_custom_options (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id uuid NOT NULL,
  option_type text NOT NULL, -- 'muscle_group', 'equipment', 'category'
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(trainer_id, option_type, name)
);

-- Enable RLS
ALTER TABLE public.exercise_custom_options ENABLE ROW LEVEL SECURITY;

-- Trainers can manage their own custom options
CREATE POLICY "Trainers can manage their custom options"
ON public.exercise_custom_options
FOR ALL
USING (auth.uid() = trainer_id);
