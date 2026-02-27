
ALTER TABLE public.client_feature_settings
  ADD COLUMN IF NOT EXISTS fasting_strict_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS eating_window_hours integer NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS eating_window_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_fast_completed_at timestamptz;
