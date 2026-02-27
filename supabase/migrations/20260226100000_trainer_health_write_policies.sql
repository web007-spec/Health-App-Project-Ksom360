-- Allow trainers to INSERT health_data for their assigned clients
-- This supports the "Preview as Client" flow where the trainer's device
-- reads HealthKit and writes data on behalf of the client.
CREATE POLICY "Trainers can insert health data for assigned clients"
  ON public.health_data
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.client_id = health_data.client_id
      AND tc.trainer_id = auth.uid()
    )
  );

-- Allow trainers to UPDATE health_data for their assigned clients
CREATE POLICY "Trainers can update health data for assigned clients"
  ON public.health_data
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.client_id = health_data.client_id
      AND tc.trainer_id = auth.uid()
    )
  );

-- Allow trainers to INSERT health_connections for their assigned clients
CREATE POLICY "Trainers can insert health connections for assigned clients"
  ON public.health_connections
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.client_id = health_connections.client_id
      AND tc.trainer_id = auth.uid()
    )
  );

-- Allow trainers to UPDATE health_connections for their assigned clients
CREATE POLICY "Trainers can update health connections for assigned clients"
  ON public.health_connections
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.client_id = health_connections.client_id
      AND tc.trainer_id = auth.uid()
    )
  );
