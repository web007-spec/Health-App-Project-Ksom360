-- Add fasting_enabled column to client_feature_settings
ALTER TABLE public.client_feature_settings
ADD COLUMN fasting_enabled BOOLEAN NOT NULL DEFAULT false;