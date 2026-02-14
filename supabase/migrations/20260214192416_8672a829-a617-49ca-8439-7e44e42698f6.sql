
-- Allow trainers to insert habit completions for their clients
CREATE POLICY "Trainers can insert habit completions for their clients"
ON public.habit_completions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM client_habits ch
    WHERE ch.id = habit_completions.habit_id
    AND ch.trainer_id = auth.uid()
  )
);

-- Allow trainers to delete habit completions for their clients
CREATE POLICY "Trainers can delete habit completions for their clients"
ON public.habit_completions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM client_habits ch
    WHERE ch.id = habit_completions.habit_id
    AND ch.trainer_id = auth.uid()
  )
);
