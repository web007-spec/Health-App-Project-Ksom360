-- Add video_url and image_url columns to workout_plans table
ALTER TABLE public.workout_plans 
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;