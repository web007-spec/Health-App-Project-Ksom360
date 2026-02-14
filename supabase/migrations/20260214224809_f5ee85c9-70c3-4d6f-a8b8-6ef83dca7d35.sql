
-- Add meal plan configuration columns to client_feature_settings
ALTER TABLE public.client_feature_settings
  ADD COLUMN meal_plan_type text NOT NULL DEFAULT 'none',
  ADD COLUMN meal_plan_allow_recipe_replacement boolean NOT NULL DEFAULT false,
  ADD COLUMN meal_plan_add_recipe_books boolean NOT NULL DEFAULT false,
  ADD COLUMN meal_plan_header_label text NOT NULL DEFAULT 'Meal Plan';
