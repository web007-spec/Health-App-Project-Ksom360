-- Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  servings INTEGER DEFAULT 1,
  image_url TEXT,
  calories INTEGER,
  protein NUMERIC,
  carbs NUMERIC,
  fats NUMERIC,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create recipe books table
CREATE TABLE IF NOT EXISTS recipe_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create junction table for recipe books and recipes
CREATE TABLE IF NOT EXISTS recipe_book_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_book_id UUID NOT NULL REFERENCES recipe_books(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  UNIQUE(recipe_book_id, recipe_id)
);

-- Create meal plans table
CREATE TYPE meal_plan_type AS ENUM ('flexible', 'structured', 'recipe_books_only');

CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  plan_type meal_plan_type NOT NULL,
  target_calories INTEGER,
  target_protein NUMERIC,
  target_carbs NUMERIC,
  target_fats NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create client meal plan assignments
CREATE TABLE IF NOT EXISTS client_meal_plan_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE SET NULL,
  plan_type meal_plan_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- Create structured meal plan days (for day-by-day assignments)
CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');

CREATE TABLE IF NOT EXISTS meal_plan_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  meal_type meal_type NOT NULL,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  servings NUMERIC DEFAULT 1,
  notes TEXT,
  order_index INTEGER DEFAULT 0
);

-- Create flexible meal plan options (meal options clients can choose from)
CREATE TABLE IF NOT EXISTS meal_plan_flexible_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  meal_type meal_type NOT NULL,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0
);

-- Create client recipe book assignments
CREATE TABLE IF NOT EXISTS client_recipe_book_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_book_id UUID NOT NULL REFERENCES recipe_books(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create client meal selections (track what clients chose for flexible plans or recipe books)
CREATE TABLE IF NOT EXISTS client_meal_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES client_meal_plan_assignments(id) ON DELETE CASCADE,
  meal_date DATE NOT NULL,
  meal_type meal_type NOT NULL,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  servings NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_book_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_meal_plan_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_flexible_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_recipe_book_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_meal_selections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recipes
CREATE POLICY "Trainers can manage their recipes" ON recipes
  FOR ALL USING (auth.uid() = trainer_id);

CREATE POLICY "Clients can view recipes in their meal plans" ON recipes
  FOR SELECT USING (
    id IN (
      SELECT recipe_id FROM meal_plan_days mpd
      JOIN client_meal_plan_assignments cmpa ON mpd.meal_plan_id = cmpa.meal_plan_id
      WHERE cmpa.client_id = auth.uid()
    )
    OR id IN (
      SELECT recipe_id FROM meal_plan_flexible_options mpfo
      JOIN client_meal_plan_assignments cmpa ON mpfo.meal_plan_id = cmpa.meal_plan_id
      WHERE cmpa.client_id = auth.uid()
    )
    OR id IN (
      SELECT r.id FROM recipes r
      JOIN recipe_book_recipes rbr ON r.id = rbr.recipe_id
      JOIN client_recipe_book_assignments crba ON rbr.recipe_book_id = crba.recipe_book_id
      WHERE crba.client_id = auth.uid()
    )
  );

-- RLS Policies for recipe books
CREATE POLICY "Trainers can manage their recipe books" ON recipe_books
  FOR ALL USING (auth.uid() = trainer_id);

CREATE POLICY "Clients can view assigned recipe books" ON recipe_books
  FOR SELECT USING (
    id IN (
      SELECT recipe_book_id FROM client_recipe_book_assignments
      WHERE client_id = auth.uid()
    )
  );

-- RLS Policies for recipe book recipes
CREATE POLICY "Trainers can manage recipe book recipes" ON recipe_book_recipes
  FOR ALL USING (
    recipe_book_id IN (SELECT id FROM recipe_books WHERE trainer_id = auth.uid())
  );

CREATE POLICY "Clients can view recipe book recipes" ON recipe_book_recipes
  FOR SELECT USING (
    recipe_book_id IN (
      SELECT recipe_book_id FROM client_recipe_book_assignments
      WHERE client_id = auth.uid()
    )
  );

-- RLS Policies for meal plans
CREATE POLICY "Trainers can manage their meal plans" ON meal_plans
  FOR ALL USING (auth.uid() = trainer_id);

CREATE POLICY "Clients can view assigned meal plans" ON meal_plans
  FOR SELECT USING (
    id IN (
      SELECT meal_plan_id FROM client_meal_plan_assignments
      WHERE client_id = auth.uid()
    )
  );

-- RLS Policies for client meal plan assignments
CREATE POLICY "Trainers can manage client assignments" ON client_meal_plan_assignments
  FOR ALL USING (auth.uid() = trainer_id);

CREATE POLICY "Clients can view their assignments" ON client_meal_plan_assignments
  FOR SELECT USING (auth.uid() = client_id);

-- RLS Policies for meal plan days
CREATE POLICY "Trainers can manage meal plan days" ON meal_plan_days
  FOR ALL USING (
    meal_plan_id IN (SELECT id FROM meal_plans WHERE trainer_id = auth.uid())
  );

CREATE POLICY "Clients can view their meal plan days" ON meal_plan_days
  FOR SELECT USING (
    meal_plan_id IN (
      SELECT meal_plan_id FROM client_meal_plan_assignments
      WHERE client_id = auth.uid()
    )
  );

-- RLS Policies for flexible options
CREATE POLICY "Trainers can manage flexible options" ON meal_plan_flexible_options
  FOR ALL USING (
    meal_plan_id IN (SELECT id FROM meal_plans WHERE trainer_id = auth.uid())
  );

CREATE POLICY "Clients can view their flexible options" ON meal_plan_flexible_options
  FOR SELECT USING (
    meal_plan_id IN (
      SELECT meal_plan_id FROM client_meal_plan_assignments
      WHERE client_id = auth.uid()
    )
  );

-- RLS Policies for recipe book assignments
CREATE POLICY "Trainers can manage recipe book assignments" ON client_recipe_book_assignments
  FOR ALL USING (auth.uid() = trainer_id);

CREATE POLICY "Clients can view their recipe book assignments" ON client_recipe_book_assignments
  FOR SELECT USING (auth.uid() = client_id);

-- RLS Policies for client meal selections
CREATE POLICY "Clients can manage their meal selections" ON client_meal_selections
  FOR ALL USING (auth.uid() = client_id);

CREATE POLICY "Trainers can view client selections" ON client_meal_selections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM client_meal_plan_assignments cmpa
      WHERE cmpa.id = client_meal_selections.assignment_id
      AND cmpa.trainer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM trainer_clients tc
      WHERE tc.client_id = client_meal_selections.client_id
      AND tc.trainer_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_recipes_trainer ON recipes(trainer_id);
CREATE INDEX idx_recipe_books_trainer ON recipe_books(trainer_id);
CREATE INDEX idx_meal_plans_trainer ON meal_plans(trainer_id);
CREATE INDEX idx_client_meal_assignments_client ON client_meal_plan_assignments(client_id);
CREATE INDEX idx_meal_plan_days_plan_date ON meal_plan_days(meal_plan_id, plan_date);
CREATE INDEX idx_client_meal_selections_date ON client_meal_selections(client_id, meal_date);

-- Add trigger for updated_at
CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_recipe_books_updated_at
  BEFORE UPDATE ON recipe_books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_meal_plans_updated_at
  BEFORE UPDATE ON meal_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();