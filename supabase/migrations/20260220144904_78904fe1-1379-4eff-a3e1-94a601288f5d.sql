
-- ============================================================
-- 1) Auto-set current_value (start weight) from first qualifying metric_entries row
--    Adapted: fitness_goals uses status='active' + current_value
--             metric_entries uses value + recorded_at + client_metric_id (Weight metric)
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_goal_start_weight_from_weighin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metric_name text;
  v_weigh_in_date date;
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

  -- Set current_value once (only if NULL = not yet set = start weight not locked)
  -- Also respect lock_start_weight_after_set from client_feature_settings
  UPDATE public.fitness_goals g
  SET current_value = NEW.value,
      updated_at = now()
  WHERE g.client_id = NEW.client_id
    AND g.status = 'active'
    AND g.current_value IS NULL
    AND v_weigh_in_date >= g.start_date
    AND (
      -- Check feature flag; if no row exists, default to locking (only set once)
      NOT EXISTS (
        SELECT 1 FROM public.client_feature_settings cfs
        WHERE cfs.client_id = NEW.client_id
          AND cfs.lock_start_weight_after_set = false
      )
      OR
      -- If flag explicitly says NOT locked, still set if NULL (first set)
      EXISTS (
        SELECT 1 FROM public.client_feature_settings cfs
        WHERE cfs.client_id = NEW.client_id
          AND cfs.lock_start_weight_after_set = false
      )
    );

  RETURN NEW;
END;
$$;

-- Attach trigger to metric_entries
DROP TRIGGER IF EXISTS trg_set_goal_start_weight_from_weighin ON public.metric_entries;

CREATE TRIGGER trg_set_goal_start_weight_from_weighin
AFTER INSERT ON public.metric_entries
FOR EACH ROW
EXECUTE FUNCTION public.set_goal_start_weight_from_weighin();


-- ============================================================
-- 2) Touch updated_at on fitness_goals before any update
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_goals_updated_at ON public.fitness_goals;
CREATE TRIGGER trg_touch_goals_updated_at
BEFORE UPDATE ON public.fitness_goals
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();


-- ============================================================
-- 3) Ensure only ONE active goal per client
--    Adapted: uses status='active' instead of is_active boolean
-- ============================================================
CREATE OR REPLACE FUNCTION public.ensure_single_active_goal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE public.fitness_goals
    SET status = 'paused',
        updated_at = now()
    WHERE client_id = NEW.client_id
      AND id <> NEW.id
      AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_single_active_goal_insert ON public.fitness_goals;
CREATE TRIGGER trg_ensure_single_active_goal_insert
AFTER INSERT ON public.fitness_goals
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_active_goal();

DROP TRIGGER IF EXISTS trg_ensure_single_active_goal_update ON public.fitness_goals;
CREATE TRIGGER trg_ensure_single_active_goal_update
AFTER UPDATE OF status ON public.fitness_goals
FOR EACH ROW
WHEN (NEW.status = 'active')
EXECUTE FUNCTION public.ensure_single_active_goal();


-- ============================================================
-- 4) Unique partial index: enforce single active goal at DB level
-- ============================================================
DROP INDEX IF EXISTS public.uniq_one_active_goal_per_client;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_one_active_goal_per_client
  ON public.fitness_goals(client_id)
  WHERE status = 'active';
