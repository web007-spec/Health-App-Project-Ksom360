CREATE POLICY "Clients can view sections in assigned workouts"
ON public.workout_sections
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM client_workouts cw
    WHERE cw.workout_plan_id = workout_sections.workout_plan_id
    AND cw.client_id = auth.uid()
  )
);