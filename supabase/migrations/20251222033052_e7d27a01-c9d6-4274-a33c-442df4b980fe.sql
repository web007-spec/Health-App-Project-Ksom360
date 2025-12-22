-- Drop existing problematic policies on recipes table
DROP POLICY IF EXISTS "Trainers can view their own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Trainers can create their own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Trainers can update their own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Trainers can delete their own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Clients can view recipes from assigned recipe books" ON public.recipes;
DROP POLICY IF EXISTS "Users can view their own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can create their own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can update their own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can delete their own recipes" ON public.recipes;

-- Recreate simple, non-recursive policies
CREATE POLICY "Trainers can view their own recipes"
ON public.recipes
FOR SELECT
USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can create their own recipes"
ON public.recipes
FOR INSERT
WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can update their own recipes"
ON public.recipes
FOR UPDATE
USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can delete their own recipes"
ON public.recipes
FOR DELETE
USING (auth.uid() = trainer_id);