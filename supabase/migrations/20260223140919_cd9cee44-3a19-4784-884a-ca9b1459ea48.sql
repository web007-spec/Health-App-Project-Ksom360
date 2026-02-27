
-- 1) System Events audit table
CREATE TABLE public.system_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  client_id uuid NOT NULL,
  coach_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_system_events_client ON public.system_events(client_id);
CREATE INDEX idx_system_events_type ON public.system_events(event_type);
CREATE INDEX idx_system_events_created ON public.system_events(created_at DESC);

ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view their clients events"
  ON public.system_events FOR SELECT
  USING (
    coach_id = auth.uid()
    OR client_id IN (
      SELECT client_id FROM client_feature_settings WHERE trainer_id = auth.uid()
    )
  );

CREATE POLICY "System can insert events"
  ON public.system_events FOR INSERT
  WITH CHECK (true);

-- 2) Add incomplete_data_flag to notification_events for scoring records
-- We'll use system_events for scoring flags instead

-- 3) Add blocked_reason tracking to client_feature_settings
ALTER TABLE public.client_feature_settings
  ADD COLUMN IF NOT EXISTS level_blocked_reason text,
  ADD COLUMN IF NOT EXISTS last_engine_switch_at timestamptz;
