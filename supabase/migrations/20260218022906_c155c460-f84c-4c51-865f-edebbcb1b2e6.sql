ALTER TABLE public.client_feature_settings
ADD COLUMN active_fast_start_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN active_fast_target_hours INTEGER,
ADD COLUMN last_fast_ended_at TIMESTAMP WITH TIME ZONE;