
-- Trainer-customizable cardio activity types
CREATE TABLE public.cardio_activity_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon_name TEXT NOT NULL DEFAULT 'activity',
  is_default BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cardio_activity_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage their own activity types"
  ON public.cardio_activity_types FOR ALL
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Clients can view their trainer's activity types
CREATE POLICY "Clients can view trainer activity types"
  ON public.cardio_activity_types FOR SELECT
  USING (
    trainer_id IN (
      SELECT trainer_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Unique constraint per trainer
CREATE UNIQUE INDEX idx_cardio_activity_types_unique ON public.cardio_activity_types (trainer_id, name);
