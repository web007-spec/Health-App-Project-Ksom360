
-- Create engine_mode enum type
CREATE TYPE public.engine_mode AS ENUM ('metabolic_stability', 'performance_readiness', 'game_readiness');

-- Add engine_mode column to client_feature_settings
ALTER TABLE public.client_feature_settings
ADD COLUMN engine_mode public.engine_mode NOT NULL DEFAULT 'metabolic_stability';

-- Add engine_mode to profiles for quick access (denormalized for rendering speed)
ALTER TABLE public.profiles
ADD COLUMN engine_mode public.engine_mode NOT NULL DEFAULT 'metabolic_stability';
