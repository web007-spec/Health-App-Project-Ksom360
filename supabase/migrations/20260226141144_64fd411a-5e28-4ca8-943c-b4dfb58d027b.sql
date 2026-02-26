
-- Custom equipment items with uploaded icons
CREATE TABLE public.custom_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  icon_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage their own custom equipment"
  ON public.custom_equipment
  FOR ALL
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

-- Reuse existing task-icons bucket for equipment icon uploads (already exists)
