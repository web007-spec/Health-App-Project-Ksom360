
-- Create progress tile configuration table for the "My Progress" section on client dashboard
CREATE TABLE public.client_progress_tiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tile_key TEXT NOT NULL, -- e.g. 'steps', 'sleep', 'body_weight', 'body_fat', 'caloric_intake', 'resting_hr', 'lean_body_mass', 'photos', or metric_definition_id
  label TEXT NOT NULL,
  unit TEXT DEFAULT '',
  is_visible BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  metric_definition_id UUID REFERENCES public.metric_definitions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, tile_key)
);

ALTER TABLE public.client_progress_tiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress tiles"
ON public.client_progress_tiles FOR SELECT
USING (auth.uid() = client_id);

CREATE POLICY "Users can update their own progress tiles"
ON public.client_progress_tiles FOR UPDATE
USING (auth.uid() = client_id);

CREATE POLICY "Users can insert their own progress tiles"
ON public.client_progress_tiles FOR INSERT
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can delete their own progress tiles"
ON public.client_progress_tiles FOR DELETE
USING (auth.uid() = client_id);

-- Trainers can also manage client progress tiles
CREATE POLICY "Trainers can view client progress tiles"
ON public.client_progress_tiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_feature_settings cfs
    WHERE cfs.client_id = client_progress_tiles.client_id
    AND cfs.trainer_id = auth.uid()
  )
);

CREATE POLICY "Trainers can insert client progress tiles"
ON public.client_progress_tiles FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_feature_settings cfs
    WHERE cfs.client_id = client_progress_tiles.client_id
    AND cfs.trainer_id = auth.uid()
  )
);

CREATE POLICY "Trainers can update client progress tiles"
ON public.client_progress_tiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.client_feature_settings cfs
    WHERE cfs.client_id = client_progress_tiles.client_id
    AND cfs.trainer_id = auth.uid()
  )
);

-- Function to provision default progress tiles for a client
CREATE OR REPLACE FUNCTION public.provision_default_progress_tiles(p_client_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO client_progress_tiles (client_id, tile_key, label, unit, order_index, metric_definition_id)
  VALUES
    (p_client_id, 'steps', 'Steps', 'steps', 0, (SELECT id FROM metric_definitions WHERE name = 'Steps' AND is_default = true LIMIT 1)),
    (p_client_id, 'sleep', 'Sleep', 'hrs', 1, (SELECT id FROM metric_definitions WHERE name = 'Sleep' AND is_default = true LIMIT 1)),
    (p_client_id, 'body_weight', 'Body Weight', 'lbs', 2, (SELECT id FROM metric_definitions WHERE name = 'Weight' AND is_default = true LIMIT 1)),
    (p_client_id, 'body_fat', 'Body Fat', '%', 3, (SELECT id FROM metric_definitions WHERE name = 'Body Fat' AND is_default = true LIMIT 1)),
    (p_client_id, 'caloric_intake', 'Caloric Intake', 'cal', 4, NULL),
    (p_client_id, 'resting_hr', 'Resting HR', 'bpm', 5, (SELECT id FROM metric_definitions WHERE name = 'Heart Rate' AND is_default = true LIMIT 1)),
    (p_client_id, 'lean_body_mass', 'Lean Body Mass', 'lbs', 6, (SELECT id FROM metric_definitions WHERE name = 'Lean Body Mass' AND is_default = true LIMIT 1))
  ON CONFLICT (client_id, tile_key) DO NOTHING;
END;
$$;
