
-- Create recommendation_events table
CREATE TABLE public.recommendation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  engine_mode TEXT NOT NULL,
  score_total INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'moderate',
  lowest_factor TEXT,
  today_recommendation_text TEXT NOT NULL,
  week_recommendation_text TEXT NOT NULL,
  plan_suggestion_type TEXT,
  plan_suggestion_text TEXT,
  coach_override_required BOOLEAN NOT NULL DEFAULT TRUE,
  coach_approved BOOLEAN NOT NULL DEFAULT FALSE,
  coach_approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one recommendation event per client per day
CREATE UNIQUE INDEX idx_recommendation_events_client_date ON public.recommendation_events (client_id, date);

-- Enable RLS
ALTER TABLE public.recommendation_events ENABLE ROW LEVEL SECURITY;

-- Clients can read their own recommendations
CREATE POLICY "Clients can view own recommendations"
  ON public.recommendation_events FOR SELECT
  USING (client_id = auth.uid());

-- Trainers can view their clients' recommendations
CREATE POLICY "Trainers can view client recommendations"
  ON public.recommendation_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_feature_settings cfs
      WHERE cfs.client_id = recommendation_events.client_id
        AND cfs.trainer_id = auth.uid()
    )
  );

-- System inserts (via client context)
CREATE POLICY "Clients can insert own recommendations"
  ON public.recommendation_events FOR INSERT
  WITH CHECK (client_id = auth.uid());

-- Allow upsert
CREATE POLICY "Clients can update own recommendations"
  ON public.recommendation_events FOR UPDATE
  USING (client_id = auth.uid());

-- Trainers can approve recommendations
CREATE POLICY "Trainers can update client recommendations"
  ON public.recommendation_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM client_feature_settings cfs
      WHERE cfs.client_id = recommendation_events.client_id
        AND cfs.trainer_id = auth.uid()
    )
  );
