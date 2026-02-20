
-- ============================================================
-- 1) Add history columns to fitness_goals (if not already there)
-- ============================================================
ALTER TABLE public.fitness_goals
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS ended_reason TEXT NULL;  -- 'replaced', 'completed', 'coach_ended', 'client_ended'

-- ============================================================
-- 2) stamp_goal_end: when status changes away from 'active', stamp ended_at
--    Adapted: uses status text field instead of is_active boolean
-- ============================================================
CREATE OR REPLACE FUNCTION public.stamp_goal_end()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If goal is being deactivated (was active, now something else)
  IF OLD.status = 'active' AND NEW.status <> 'active' THEN
    IF NEW.ended_at IS NULL THEN
      NEW.ended_at = now();
    END IF;
    -- Default ended_reason if not explicitly set
    IF NEW.ended_reason IS NULL THEN
      NEW.ended_reason = 'replaced';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_goal_end ON public.fitness_goals;
CREATE TRIGGER trg_stamp_goal_end
BEFORE UPDATE OF status ON public.fitness_goals
FOR EACH ROW
EXECUTE FUNCTION public.stamp_goal_end();

-- ============================================================
-- 3) Re-attach ensure_single_active_goal triggers
--    (function exists, triggers were missing)
-- ============================================================
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
-- 4) Re-attach touch_updated_at trigger on fitness_goals
-- ============================================================
DROP TRIGGER IF EXISTS trg_touch_goals_updated_at ON public.fitness_goals;
CREATE TRIGGER trg_touch_goals_updated_at
BEFORE UPDATE ON public.fitness_goals
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- 5) Re-attach set_goal_start_weight_from_weighin on metric_entries
-- ============================================================
DROP TRIGGER IF EXISTS trg_set_goal_start_weight_from_weighin ON public.metric_entries;
CREATE TRIGGER trg_set_goal_start_weight_from_weighin
AFTER INSERT ON public.metric_entries
FOR EACH ROW
EXECUTE FUNCTION public.set_goal_start_weight_from_weighin();

-- ============================================================
-- 6) Unique index: enforce single active goal at DB level
-- ============================================================
DROP INDEX IF EXISTS public.uniq_one_active_goal_per_client;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_one_active_goal_per_client
  ON public.fitness_goals(client_id)
  WHERE status = 'active';
