
-- Replace engine_mode enum: metabolic_stability/performance_readiness/game_readiness → metabolic/performance/athletic
-- Step 1: Drop columns using old enum
ALTER TABLE public.profiles DROP COLUMN IF EXISTS engine_mode;
ALTER TABLE public.client_feature_settings DROP COLUMN IF EXISTS engine_mode;

-- Step 2: Drop old enum
DROP TYPE IF EXISTS public.engine_mode;

-- Step 3: Create new enum
CREATE TYPE public.engine_mode AS ENUM ('metabolic', 'performance', 'athletic');

-- Step 4: Add columns with new enum, default = performance
ALTER TABLE public.profiles
ADD COLUMN engine_mode public.engine_mode NOT NULL DEFAULT 'performance';

ALTER TABLE public.client_feature_settings
ADD COLUMN engine_mode public.engine_mode NOT NULL DEFAULT 'performance';
