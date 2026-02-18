
ALTER TABLE public.client_feature_settings
  ADD COLUMN IF NOT EXISTS protocol_assigned_by uuid REFERENCES auth.users(id);
