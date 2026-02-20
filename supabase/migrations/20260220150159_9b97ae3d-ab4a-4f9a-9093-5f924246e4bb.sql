
ALTER TABLE public.fitness_goals
  DROP CONSTRAINT IF EXISTS fitness_goals_goal_type_check;

ALTER TABLE public.fitness_goals
  ADD CONSTRAINT fitness_goals_goal_type_check
  CHECK (goal_type IN (
    'weight', 'body_fat', 'workouts', 'strength', 'custom',
    'wedding', 'cruise', 'beach_trip', 'birthday', 'vacation',
    'reunion', 'photo_shoot', 'holiday', 'anniversary',
    'health_doctor', 'competition_event', 'other_custom'
  ));
