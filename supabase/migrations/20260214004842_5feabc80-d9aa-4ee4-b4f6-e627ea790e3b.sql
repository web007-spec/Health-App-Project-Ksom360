
-- Add multi-week support and status to meal_plans
ALTER TABLE public.meal_plans
ADD COLUMN num_weeks integer NOT NULL DEFAULT 1,
ADD COLUMN status text NOT NULL DEFAULT 'draft';

-- Add week_number to flexible options for weekly-based approach
ALTER TABLE public.meal_plan_flexible_options
ADD COLUMN week_number integer NOT NULL DEFAULT 1;

-- Create meal_plan_notes table for day and week notes
CREATE TABLE public.meal_plan_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id uuid NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  note_type text NOT NULL CHECK (note_type IN ('day', 'week')),
  week_number integer NOT NULL DEFAULT 1,
  day_of_week integer, -- 0=Monday...6=Sunday, null for week notes
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_plan_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage meal plan notes"
ON public.meal_plan_notes FOR ALL
USING (meal_plan_id IN (SELECT id FROM meal_plans WHERE trainer_id = auth.uid()));

CREATE POLICY "Clients can view their meal plan notes"
ON public.meal_plan_notes FOR SELECT
USING (meal_plan_id IN (
  SELECT meal_plan_id FROM client_meal_plan_assignments WHERE client_id = auth.uid()
));

-- Add day_of_week and week_number to meal_plan_days for multi-week structured plans
ALTER TABLE public.meal_plan_days
ADD COLUMN week_number integer NOT NULL DEFAULT 1,
ADD COLUMN day_of_week integer NOT NULL DEFAULT 0;

-- Add custom meal categories support
CREATE TABLE public.meal_plan_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id uuid NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  order_index integer NOT NULL DEFAULT 0
);

ALTER TABLE public.meal_plan_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage meal plan categories"
ON public.meal_plan_categories FOR ALL
USING (meal_plan_id IN (SELECT id FROM meal_plans WHERE trainer_id = auth.uid()));

CREATE POLICY "Clients can view meal plan categories"
ON public.meal_plan_categories FOR SELECT
USING (meal_plan_id IN (
  SELECT meal_plan_id FROM client_meal_plan_assignments WHERE client_id = auth.uid()
));
