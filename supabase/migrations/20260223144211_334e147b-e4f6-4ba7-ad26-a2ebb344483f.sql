
-- Extend client_weekly_summaries with outcome tracking columns
ALTER TABLE public.client_weekly_summaries
  ADD COLUMN IF NOT EXISTS bodyweight_delta numeric,
  ADD COLUMN IF NOT EXISTS performance_delta numeric,
  ADD COLUMN IF NOT EXISTS recovery_delta numeric,
  ADD COLUMN IF NOT EXISTS injury_flag boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS adherence_score numeric;

-- Factor impact history table for statistical correlations
CREATE TABLE public.factor_impact_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engine_mode text NOT NULL,
  factor_name text NOT NULL,
  week_number integer NOT NULL,
  avg_score numeric NOT NULL DEFAULT 0,
  outcome_correlation numeric DEFAULT 0,
  trend_direction text DEFAULT 'flat',
  sample_size integer DEFAULT 0,
  trainer_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.factor_impact_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view their factor impact data"
  ON public.factor_impact_history FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can insert factor impact data"
  ON public.factor_impact_history FOR INSERT
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can update their factor impact data"
  ON public.factor_impact_history FOR UPDATE
  USING (auth.uid() = trainer_id);

-- Index for efficient querying by engine + factor
CREATE INDEX idx_factor_impact_engine_factor
  ON public.factor_impact_history (engine_mode, factor_name, week_number DESC);
