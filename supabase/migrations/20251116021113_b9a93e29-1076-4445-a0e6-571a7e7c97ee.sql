-- Add is_template column to workout_plans
ALTER TABLE public.workout_plans
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;

-- Add template_category for organizing templates
ALTER TABLE public.workout_plans
ADD COLUMN IF NOT EXISTS template_category TEXT;

-- Add index for faster template queries
CREATE INDEX IF NOT EXISTS idx_workout_plans_is_template ON public.workout_plans(is_template) WHERE is_template = true;

-- Update RLS policies to allow viewing templates
CREATE POLICY "Users can view template workouts"
  ON public.workout_plans
  FOR SELECT
  USING (is_template = true);

-- Add use_count to track template popularity
ALTER TABLE public.workout_plans
ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0;