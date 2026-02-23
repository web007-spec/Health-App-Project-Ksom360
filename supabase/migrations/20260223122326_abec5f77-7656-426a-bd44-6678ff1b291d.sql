
-- Add level progression fields to client_feature_settings
ALTER TABLE public.client_feature_settings
ADD COLUMN IF NOT EXISTS current_level integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS level_start_date date NOT NULL DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS level_completion_pct numeric(5,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS level_status text NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS auto_advance_levels boolean NOT NULL DEFAULT false;

-- Add constraint for valid level range
ALTER TABLE public.client_feature_settings
ADD CONSTRAINT chk_current_level CHECK (current_level >= 1 AND current_level <= 7);

-- Add constraint for valid level_status
ALTER TABLE public.client_feature_settings
ADD CONSTRAINT chk_level_status CHECK (level_status IN ('active', 'eligible', 'completed'));
