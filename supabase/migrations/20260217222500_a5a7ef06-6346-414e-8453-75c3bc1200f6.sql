
-- Create cardio_sessions table for logging cardio activities
CREATE TABLE public.cardio_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'none',
  target_value NUMERIC,
  duration_seconds INTEGER DEFAULT 0,
  distance_miles NUMERIC,
  calories INTEGER DEFAULT 0,
  heart_rate_avg INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cardio_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their own cardio sessions"
  ON public.cardio_sessions FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can insert their own cardio sessions"
  ON public.cardio_sessions FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their own cardio sessions"
  ON public.cardio_sessions FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can delete their own cardio sessions"
  ON public.cardio_sessions FOR DELETE
  USING (auth.uid() = client_id);

-- Trainers can view via client_workouts relationship
CREATE POLICY "Trainers can view client cardio sessions"
  ON public.cardio_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_workouts cw
      WHERE cw.client_id = cardio_sessions.client_id
      AND cw.assigned_by = auth.uid()
    )
  );

CREATE INDEX idx_cardio_sessions_client_date ON public.cardio_sessions(client_id, created_at DESC);
