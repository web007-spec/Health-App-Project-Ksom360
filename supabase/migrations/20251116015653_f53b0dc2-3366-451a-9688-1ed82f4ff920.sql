-- Add workout_sections table for organizing exercises into blocks
CREATE TABLE IF NOT EXISTS public.workout_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Section',
  section_type TEXT NOT NULL DEFAULT 'straight_set', -- straight_set, superset, circuit, drop_set, emom, amrap, tabata
  order_index INTEGER NOT NULL,
  rounds INTEGER DEFAULT 1,
  work_seconds INTEGER, -- For timed workouts
  rest_seconds INTEGER, -- Rest between exercises in section
  rest_between_rounds_seconds INTEGER, -- Rest between rounds
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add section_id to workout_plan_exercises to link exercises to sections
ALTER TABLE public.workout_plan_exercises 
ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.workout_sections(id) ON DELETE CASCADE;

-- Add exercise_type to support different formats within a section
ALTER TABLE public.workout_plan_exercises
ADD COLUMN IF NOT EXISTS exercise_type TEXT DEFAULT 'normal'; -- normal, drop_set, timed

-- Add tempo field for controlled movements
ALTER TABLE public.workout_plan_exercises
ADD COLUMN IF NOT EXISTS tempo TEXT; -- e.g., "3-1-1-0"

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_workout_sections_workout_plan ON public.workout_sections(workout_plan_id);
CREATE INDEX IF NOT EXISTS idx_workout_plan_exercises_section ON public.workout_plan_exercises(section_id);

-- Enable RLS
ALTER TABLE public.workout_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workout_sections
CREATE POLICY "Trainers can manage sections in their workouts"
  ON public.workout_sections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_plans wp
      WHERE wp.id = workout_sections.workout_plan_id
      AND wp.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Users can view sections in assigned workouts"
  ON public.workout_sections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_plans wp
      WHERE wp.id = workout_sections.workout_plan_id
      AND (
        wp.trainer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.client_workouts cw
          WHERE cw.workout_plan_id = wp.id
          AND cw.client_id = auth.uid()
        )
      )
    )
  );