-- Drop the unique constraint that prevents multiple completions per habit per date
-- This is needed for habits like water tracking where multiple completions per day are expected
ALTER TABLE public.habit_completions DROP CONSTRAINT IF EXISTS habit_completions_habit_id_completion_date_key;
