
-- 1. Add goal feature flag columns to existing client_feature_settings
ALTER TABLE public.client_feature_settings
  ADD COLUMN IF NOT EXISTS pace_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS back_on_pace_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS lock_start_weight_after_set boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS client_can_edit_goal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_custom_goal_text boolean NOT NULL DEFAULT true;

-- 2. Unique partial index: only one active goal per client
CREATE UNIQUE INDEX IF NOT EXISTS uniq_one_active_goal_per_client
  ON public.fitness_goals(client_id)
  WHERE status = 'active';

-- 3. Auto-set goal start_weight trigger
-- When a Weight metric entry is inserted for a client who has an active goal
-- with no start weight yet, and the entry date >= goal.start_date, lock it in.
CREATE OR REPLACE FUNCTION public.auto_set_goal_start_weight()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metric_name text;
  v_weigh_in_date date;
  v_goal_id uuid;
BEGIN
  -- Only proceed for Weight metric entries
  SELECT md.name INTO v_metric_name
  FROM metric_definitions md
  JOIN client_metrics cm ON cm.metric_definition_id = md.id
  WHERE cm.id = NEW.client_metric_id;

  IF v_metric_name IS DISTINCT FROM 'Weight' THEN
    RETURN NEW;
  END IF;

  v_weigh_in_date := NEW.recorded_at::date;

  -- Find active goal with no start_weight set yet, where entry date >= goal start_date
  SELECT id INTO v_goal_id
  FROM fitness_goals
  WHERE client_id = NEW.client_id
    AND status = 'active'
    AND current_value IS NULL
    AND v_weigh_in_date >= start_date
  LIMIT 1;

  IF FOUND THEN
    UPDATE fitness_goals
    SET current_value = NEW.value,
        updated_at = now()
    WHERE id = v_goal_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger if it already exists to allow re-creation
DROP TRIGGER IF EXISTS trigger_auto_set_goal_start_weight ON public.metric_entries;

CREATE TRIGGER trigger_auto_set_goal_start_weight
  AFTER INSERT ON public.metric_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_goal_start_weight();

-- 4. Ensure clients cannot INSERT or DELETE their own goals (trainer-only)
-- (They can only SELECT and UPDATE progress via existing policies)
DROP POLICY IF EXISTS "Clients cannot insert goals" ON public.fitness_goals;
CREATE POLICY "Trainers only insert goals"
  ON public.fitness_goals
  FOR INSERT
  WITH CHECK (trainer_id = auth.uid());
