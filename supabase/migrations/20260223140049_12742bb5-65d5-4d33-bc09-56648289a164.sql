
-- Client weekly summary table for fast coach analytics
CREATE TABLE public.client_weekly_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.profiles(id),
  engine_mode text NOT NULL DEFAULT 'performance',
  current_level int NOT NULL DEFAULT 1,
  avg_score_7d numeric(5,1) DEFAULT 0,
  completion_7d numeric(5,1) DEFAULT 0,
  trend_direction text NOT NULL DEFAULT 'flat',
  lowest_factor_mode text,
  score_status text NOT NULL DEFAULT 'moderate',
  needs_support_days_14d int NOT NULL DEFAULT 0,
  has_pending_suggestion boolean NOT NULL DEFAULT false,
  pending_suggestion_type text,
  level_up_eligible boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_weekly_summaries ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_client_weekly_summaries_client ON public.client_weekly_summaries(client_id);

CREATE POLICY "Trainers can view their client summaries"
  ON public.client_weekly_summaries FOR SELECT
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can manage their client summaries"
  ON public.client_weekly_summaries FOR ALL
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());
