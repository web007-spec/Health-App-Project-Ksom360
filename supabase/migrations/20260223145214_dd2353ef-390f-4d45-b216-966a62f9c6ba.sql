
-- Add authority control toggles to client_feature_settings
ALTER TABLE public.client_feature_settings
  ADD COLUMN IF NOT EXISTS ai_suggestions_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_level_advance_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_plan_adjust_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_nudge_optimization_enabled boolean NOT NULL DEFAULT false;
