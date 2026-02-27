-- Fix the client SELECT policy to be simpler and correct
DROP POLICY IF EXISTS "Clients can view trainer activity types" ON cardio_activity_types;

CREATE POLICY "Anyone authenticated can view activity types"
ON cardio_activity_types
FOR SELECT
USING (auth.uid() IS NOT NULL);