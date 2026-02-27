ALTER TABLE public.client_feature_settings
ADD COLUMN restore_profile_type text NOT NULL DEFAULT 'performance';