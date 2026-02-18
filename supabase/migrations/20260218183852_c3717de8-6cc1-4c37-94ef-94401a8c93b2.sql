
ALTER TABLE public.client_feature_settings
ADD COLUMN IF NOT EXISTS maintenance_mode boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS maintenance_schedule_type text;
