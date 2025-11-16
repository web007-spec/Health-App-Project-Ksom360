-- Create exercise_alternatives table for trainer-defined substitutions
CREATE TABLE IF NOT EXISTS public.exercise_alternatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  alternative_exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  reason TEXT, -- e.g., "No equipment", "Lower impact", "Easier variation"
  trainer_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(exercise_id, alternative_exercise_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_exercise_alternatives_exercise ON public.exercise_alternatives(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_alternatives_trainer ON public.exercise_alternatives(trainer_id);

-- Enable RLS
ALTER TABLE public.exercise_alternatives ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exercise_alternatives
CREATE POLICY "Trainers can manage their exercise alternatives"
  ON public.exercise_alternatives
  FOR ALL
  USING (trainer_id = auth.uid());

CREATE POLICY "Users can view exercise alternatives"
  ON public.exercise_alternatives
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.id = exercise_alternatives.exercise_id
      AND e.trainer_id = auth.uid()
    )
    OR
    -- Clients can view alternatives for exercises in their assigned workouts
    EXISTS (
      SELECT 1 FROM public.workout_plan_exercises wpe
      JOIN public.client_workouts cw ON wpe.workout_plan_id = cw.workout_plan_id
      WHERE wpe.exercise_id = exercise_alternatives.exercise_id
      AND cw.client_id = auth.uid()
    )
  );