
-- Table to track which insights were shown to prevent repeats
CREATE TABLE public.client_insight_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL,
  insight_id text NOT NULL,
  shown_date date NOT NULL DEFAULT CURRENT_DATE,
  engine_mode text NOT NULL,
  factor_tag text,
  status_tag text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_insight_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insight history"
ON public.client_insight_history FOR SELECT
USING (client_id = auth.uid());

CREATE POLICY "Users can insert own insight history"
ON public.client_insight_history FOR INSERT
WITH CHECK (client_id = auth.uid());

-- Unique constraint: one insight per client per day
CREATE UNIQUE INDEX idx_client_insight_per_day ON public.client_insight_history (client_id, shown_date);

-- Index for recent lookups
CREATE INDEX idx_insight_history_recent ON public.client_insight_history (client_id, shown_date DESC);

-- Coach insight controls: pinned insights, custom insights, disable toggle
-- Add insights_enabled and pinned_insight to client_feature_settings
ALTER TABLE public.client_feature_settings
ADD COLUMN IF NOT EXISTS insights_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS pinned_insight_text text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pinned_insight_until timestamptz DEFAULT NULL;

-- Custom coach insights table
CREATE TABLE public.coach_custom_insights (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id uuid NOT NULL,
  client_id uuid NOT NULL,
  message text NOT NULL,
  action_text text,
  engine_mode text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_custom_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage custom insights"
ON public.coach_custom_insights FOR ALL
USING (trainer_id = auth.uid());

CREATE POLICY "Clients can view their custom insights"
ON public.coach_custom_insights FOR SELECT
USING (client_id = auth.uid());
