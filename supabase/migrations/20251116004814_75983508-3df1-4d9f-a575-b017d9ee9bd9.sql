-- Allow trainers to view their clients' profiles
CREATE POLICY "Trainers can view their clients profiles"
ON profiles
FOR SELECT
USING (
  id IN (
    SELECT client_id 
    FROM trainer_clients 
    WHERE trainer_id = auth.uid()
  )
);