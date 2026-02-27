
-- Create subscription tier enum
CREATE TYPE public.subscription_tier AS ENUM ('starter', 'pro', 'elite', 'enterprise');

-- Add subscription_tier to client_feature_settings
ALTER TABLE public.client_feature_settings
  ADD COLUMN IF NOT EXISTS subscription_tier public.subscription_tier NOT NULL DEFAULT 'starter';

-- Add subscription_tier to profiles for quick access
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier public.subscription_tier NOT NULL DEFAULT 'starter';
