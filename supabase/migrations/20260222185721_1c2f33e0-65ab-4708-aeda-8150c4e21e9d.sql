
-- Add is_premium flag to client_feature_settings
ALTER TABLE public.client_feature_settings
ADD COLUMN is_premium boolean NOT NULL DEFAULT false;
