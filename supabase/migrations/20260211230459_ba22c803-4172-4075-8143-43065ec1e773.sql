CREATE POLICY "Clients can view exercises in assigned workouts"
ON public.exercises
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM workout_plan_exercises wpe
    JOIN client_workouts cw ON cw.workout_plan_id = wpe.workout_plan_id
    WHERE wpe.exercise_id = exercises.id
    AND cw.client_id = auth.uid()
  )
);