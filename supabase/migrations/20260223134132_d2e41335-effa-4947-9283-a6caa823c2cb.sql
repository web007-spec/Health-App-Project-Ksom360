
-- Add plan gating metadata to fasting_protocols
ALTER TABLE public.fasting_protocols
  ADD COLUMN IF NOT EXISTS engine_allowed text[] NOT NULL DEFAULT '{metabolic,performance}',
  ADD COLUMN IF NOT EXISTS min_level_required int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_level_allowed int NULL,
  ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'fasting',
  ADD COLUMN IF NOT EXISTS intensity_tier text NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS is_extended_fast boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_youth_safe boolean NOT NULL DEFAULT false;

-- Add plan gating metadata to quick_fasting_plans
ALTER TABLE public.quick_fasting_plans
  ADD COLUMN IF NOT EXISTS engine_allowed text[] NOT NULL DEFAULT '{metabolic,performance}',
  ADD COLUMN IF NOT EXISTS min_level_required int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_level_allowed int NULL,
  ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'fasting',
  ADD COLUMN IF NOT EXISTS intensity_tier text NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS is_extended_fast boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_youth_safe boolean NOT NULL DEFAULT false;

-- Set intensity tiers and extended fast flags based on existing data
-- Quick plans: beginner=low, intermediate=medium, advanced=high, long_fasts=extreme+extended
UPDATE public.quick_fasting_plans SET intensity_tier = 'low' WHERE difficulty_group = 'beginner';
UPDATE public.quick_fasting_plans SET intensity_tier = 'medium' WHERE difficulty_group = 'intermediate';
UPDATE public.quick_fasting_plans SET intensity_tier = 'high', min_level_required = 3 WHERE difficulty_group = 'advanced';
UPDATE public.quick_fasting_plans SET intensity_tier = 'extreme', is_extended_fast = true, min_level_required = 5 WHERE difficulty_group = 'long_fasts';

-- Protocols: set based on difficulty_level
UPDATE public.fasting_protocols SET intensity_tier = 'low' WHERE difficulty_level = 'beginner';
UPDATE public.fasting_protocols SET intensity_tier = 'medium', min_level_required = 2 WHERE difficulty_level = 'intermediate';
UPDATE public.fasting_protocols SET intensity_tier = 'high', min_level_required = 4 WHERE difficulty_level = 'advanced';

-- Mark extended fasts (>24h)
UPDATE public.quick_fasting_plans SET is_extended_fast = true WHERE fast_hours > 24;
UPDATE public.fasting_protocols SET is_extended_fast = true WHERE fast_target_hours > 24;

-- Coach plan overrides table
CREATE TABLE public.coach_plan_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL,
  plan_id text NOT NULL,
  plan_source text NOT NULL DEFAULT 'quick_plan', -- 'quick_plan' or 'protocol'
  coach_id uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_plan_overrides ENABLE ROW LEVEL SECURITY;

-- Trainers can manage overrides for their clients
CREATE POLICY "Trainers can view overrides for their clients"
  ON public.coach_plan_overrides FOR SELECT
  USING (
    coach_id = auth.uid()
    OR client_id IN (
      SELECT client_id FROM public.client_feature_settings WHERE trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can insert overrides"
  ON public.coach_plan_overrides FOR INSERT
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Trainers can delete overrides"
  ON public.coach_plan_overrides FOR DELETE
  USING (coach_id = auth.uid());

-- Clients can read their own overrides
CREATE POLICY "Clients can view their own overrides"
  ON public.coach_plan_overrides FOR SELECT
  USING (client_id = auth.uid());
