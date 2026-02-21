-- Allow trainers to insert/update/delete cardio sessions for their clients
-- Uses client_feature_settings to verify trainer-client relationship

CREATE POLICY "Trainers can insert cardio sessions for their clients"
ON public.cardio_sessions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM client_feature_settings cfs
    WHERE cfs.client_id = cardio_sessions.client_id
      AND cfs.trainer_id = auth.uid()
  )
);

CREATE POLICY "Trainers can update cardio sessions for their clients"
ON public.cardio_sessions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM client_feature_settings cfs
    WHERE cfs.client_id = cardio_sessions.client_id
      AND cfs.trainer_id = auth.uid()
  )
);

CREATE POLICY "Trainers can delete cardio sessions for their clients"
ON public.cardio_sessions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM client_feature_settings cfs
    WHERE cfs.client_id = cardio_sessions.client_id
      AND cfs.trainer_id = auth.uid()
  )
);