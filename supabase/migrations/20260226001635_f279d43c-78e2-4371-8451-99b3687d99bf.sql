
CREATE TABLE public.studio_program_workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.studio_programs(id) ON DELETE CASCADE,
  workout_id UUID REFERENCES public.ondemand_workouts(id) ON DELETE SET NULL,
  week_number INT NOT NULL DEFAULT 1,
  day_of_week INT NOT NULL DEFAULT 1,
  order_index INT NOT NULL DEFAULT 0,
  is_rest_day BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.studio_program_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage their program workouts"
  ON public.studio_program_workouts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.studio_programs sp
      WHERE sp.id = program_id AND sp.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.studio_programs sp
      WHERE sp.id = program_id AND sp.trainer_id = auth.uid()
    )
  );
