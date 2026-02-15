
-- Recipe ingredients table
CREATE TABLE public.recipe_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount TEXT,
  unit TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage ingredients" ON public.recipe_ingredients FOR ALL
  USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.trainer_id = auth.uid()));

CREATE POLICY "Clients can view ingredients in their recipes" ON public.recipe_ingredients FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM recipes r WHERE r.id = recipe_ingredients.recipe_id AND (
      r.id IN (SELECT mpd.recipe_id FROM meal_plan_days mpd JOIN client_meal_plan_assignments cmpa ON mpd.meal_plan_id = cmpa.meal_plan_id WHERE cmpa.client_id = auth.uid())
      OR r.id IN (SELECT mpfo.recipe_id FROM meal_plan_flexible_options mpfo JOIN client_meal_plan_assignments cmpa ON mpfo.meal_plan_id = cmpa.meal_plan_id WHERE cmpa.client_id = auth.uid())
      OR EXISTS (SELECT 1 FROM recipe_book_recipes rbr JOIN client_recipe_book_assignments crba ON rbr.recipe_book_id = crba.recipe_book_id WHERE rbr.recipe_id = r.id AND crba.client_id = auth.uid())
    )
  ));

-- Client saved recipe collections
CREATE TABLE public.client_recipe_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Saved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_recipe_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients can manage their collections" ON public.client_recipe_collections FOR ALL USING (auth.uid() = client_id);

-- Client saved recipes (bookmarks)
CREATE TABLE public.client_saved_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES public.client_recipe_collections(id) ON DELETE SET NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, recipe_id)
);
ALTER TABLE public.client_saved_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients can manage their saved recipes" ON public.client_saved_recipes FOR ALL USING (auth.uid() = client_id);
