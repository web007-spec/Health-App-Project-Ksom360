ALTER TABLE public.workout_plan_exercises ALTER COLUMN exercise_id DROP NOT NULL;
ALTER TABLE public.workout_plan_exercises DROP CONSTRAINT IF EXISTS workout_plan_exercises_exercise_id_fkey;
ALTER TABLE public.workout_plan_exercises ADD CONSTRAINT workout_plan_exercises_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE CASCADE;