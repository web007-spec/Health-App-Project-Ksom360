-- Fix infinite recursion in client_collection_access RLS
-- The existing policy references resource_collections which in turn references client_collection_access

-- Drop the recursive trainer policy on client_collection_access
DROP POLICY IF EXISTS "Trainers can manage client access to their collections" ON public.client_collection_access;

-- Add a simple client read policy
CREATE POLICY "Clients can view their own collection access"
ON public.client_collection_access
FOR SELECT
USING (client_id = auth.uid());

-- Add trainer policy that doesn't cause recursion (check trainer_id via a security definer function)
CREATE OR REPLACE FUNCTION public.is_trainer_of_collection(p_collection_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM resource_collections
    WHERE id = p_collection_id AND trainer_id = auth.uid()
  )
$$;

CREATE POLICY "Trainers can manage client collection access"
ON public.client_collection_access
FOR ALL
USING (public.is_trainer_of_collection(collection_id));

-- Fix infinite recursion in client_workout_collection_access RLS
DROP POLICY IF EXISTS "Trainers can manage client access to workout collections" ON public.client_workout_collection_access;

-- Add a simple client read policy
CREATE POLICY "Clients can view their own workout collection access"
ON public.client_workout_collection_access
FOR SELECT
USING (client_id = auth.uid());

-- Add trainer policy that doesn't cause recursion
CREATE OR REPLACE FUNCTION public.is_trainer_of_workout_collection(p_collection_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workout_collections
    WHERE id = p_collection_id AND trainer_id = auth.uid()
  )
$$;

CREATE POLICY "Trainers can manage client workout collection access"
ON public.client_workout_collection_access
FOR ALL
USING (public.is_trainer_of_workout_collection(collection_id));