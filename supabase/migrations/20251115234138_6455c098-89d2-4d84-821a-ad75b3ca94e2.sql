-- Fix trainer_clients RLS policy for client creation
-- The issue: When a trainer creates a client account, the client gets auto-logged in
-- and then can't insert into trainer_clients because they're not the trainer

DROP POLICY IF EXISTS "Trainers can manage their clients" ON public.trainer_clients;

-- Create separate policies for INSERT and other operations
CREATE POLICY "Trainers can insert their clients"
  ON public.trainer_clients
  FOR INSERT
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can update their clients"
  ON public.trainer_clients
  FOR UPDATE
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can delete their clients"
  ON public.trainer_clients
  FOR DELETE
  USING (auth.uid() = trainer_id);

-- Keep the SELECT policy separate
-- This policy already exists and is correct

-- Fix infinite recursion in workout_collections policies
-- The issue is the nested EXISTS queries creating circular references

DROP POLICY IF EXISTS "Trainers can manage their workout collections" ON public.workout_collections;
DROP POLICY IF EXISTS "Clients can view their assigned workout collections" ON public.workout_collections;

-- Recreate policies without circular references
CREATE POLICY "Trainers can manage their workout collections"
  ON public.workout_collections
  FOR ALL
  USING (trainer_id = auth.uid());

CREATE POLICY "Clients can view their assigned workout collections"
  ON public.workout_collections
  FOR SELECT
  USING (
    id IN (
      SELECT collection_id 
      FROM client_workout_collection_access 
      WHERE client_id = auth.uid()
    )
  );

-- Fix similar issues in workout_collection_categories
DROP POLICY IF EXISTS "Trainers can manage categories in their collections" ON public.workout_collection_categories;
DROP POLICY IF EXISTS "Clients can view categories in their collections" ON public.workout_collection_categories;

CREATE POLICY "Trainers can manage categories in their collections"
  ON public.workout_collection_categories
  FOR ALL
  USING (
    collection_id IN (
      SELECT id FROM workout_collections WHERE trainer_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view categories in their collections"
  ON public.workout_collection_categories
  FOR SELECT
  USING (
    collection_id IN (
      SELECT collection_id 
      FROM client_workout_collection_access 
      WHERE client_id = auth.uid()
    )
  );

-- Fix similar issues in category_workouts
DROP POLICY IF EXISTS "Trainers can manage category workouts" ON public.category_workouts;
DROP POLICY IF EXISTS "Clients can view category workouts" ON public.category_workouts;

CREATE POLICY "Trainers can manage category workouts"
  ON public.category_workouts
  FOR ALL
  USING (
    category_id IN (
      SELECT wcc.id 
      FROM workout_collection_categories wcc
      JOIN workout_collections wc ON wcc.collection_id = wc.id
      WHERE wc.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view category workouts"
  ON public.category_workouts
  FOR SELECT
  USING (
    category_id IN (
      SELECT wcc.id
      FROM workout_collection_categories wcc
      WHERE wcc.collection_id IN (
        SELECT collection_id 
        FROM client_workout_collection_access 
        WHERE client_id = auth.uid()
      )
    )
  );

-- Fix ondemand_workouts client view policy
DROP POLICY IF EXISTS "Clients can view workouts in their collections" ON public.ondemand_workouts;

CREATE POLICY "Clients can view workouts in their collections"
  ON public.ondemand_workouts
  FOR SELECT
  USING (
    id IN (
      SELECT cw.workout_id
      FROM category_workouts cw
      JOIN workout_collection_categories wcc ON cw.category_id = wcc.id
      WHERE wcc.collection_id IN (
        SELECT collection_id 
        FROM client_workout_collection_access 
        WHERE client_id = auth.uid()
      )
    )
  );