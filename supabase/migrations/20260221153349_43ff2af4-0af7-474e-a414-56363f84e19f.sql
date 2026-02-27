
ALTER TABLE public.quick_fasting_plans
ADD COLUMN description jsonb DEFAULT NULL;

COMMENT ON COLUMN public.quick_fasting_plans.description IS 'Structured plan description with subtitle, how_it_works, benefits, daily_structure, focus, who_for fields';
