-- Fix infinite recursion in recipes RLS policy by removing self-referential subquery

DROP POLICY IF EXISTS "Clients can view recipes in their meal plans" ON public.recipes;

CREATE POLICY "Clients can view recipes in their meal plans"
ON public.recipes
FOR SELECT
USING (
  (id IN (
    SELECT mpd.recipe_id
    FROM public.meal_plan_days mpd
    JOIN public.client_meal_plan_assignments cmpa
      ON mpd.meal_plan_id = cmpa.meal_plan_id
    WHERE cmpa.client_id = auth.uid()
  ))
  OR
  (id IN (
    SELECT mpfo.recipe_id
    FROM public.meal_plan_flexible_options mpfo
    JOIN public.client_meal_plan_assignments cmpa
      ON mpfo.meal_plan_id = cmpa.meal_plan_id
    WHERE cmpa.client_id = auth.uid()
  ))
  OR
  EXISTS (
    SELECT 1
    FROM public.recipe_book_recipes rbr
    JOIN public.client_recipe_book_assignments crba
      ON rbr.recipe_book_id = crba.recipe_book_id
    WHERE rbr.recipe_id = public.recipes.id
      AND crba.client_id = auth.uid()
  )
);

-- (Optional) keep trainer policies as-is; this migration only addresses recursion.