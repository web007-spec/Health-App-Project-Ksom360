-- Create goals table
CREATE TABLE IF NOT EXISTS public.fitness_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('weight', 'body_fat', 'workouts', 'strength', 'custom')),
  title TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'paused')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT valid_dates CHECK (target_date >= start_date),
  CONSTRAINT valid_target CHECK (target_value IS NULL OR target_value > 0)
);

-- Create goal milestones table
CREATE TABLE IF NOT EXISTS public.goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.fitness_goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  achieved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fitness_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;

-- RLS policies for fitness_goals
CREATE POLICY "Trainers can manage goals for their clients"
ON public.fitness_goals
FOR ALL
TO authenticated
USING (
  trainer_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM trainer_clients tc 
    WHERE tc.client_id = fitness_goals.client_id 
    AND tc.trainer_id = auth.uid()
  )
);

CREATE POLICY "Clients can view their own goals"
ON public.fitness_goals
FOR SELECT
TO authenticated
USING (client_id = auth.uid());

CREATE POLICY "Clients can update their current progress"
ON public.fitness_goals
FOR UPDATE
TO authenticated
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid());

-- RLS policies for goal_milestones
CREATE POLICY "Trainers can manage milestones for their client goals"
ON public.goal_milestones
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM fitness_goals fg
    WHERE fg.id = goal_milestones.goal_id
    AND (
      fg.trainer_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM trainer_clients tc
        WHERE tc.client_id = fg.client_id
        AND tc.trainer_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Clients can view milestones for their goals"
ON public.goal_milestones
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM fitness_goals fg
    WHERE fg.id = goal_milestones.goal_id
    AND fg.client_id = auth.uid()
  )
);

-- Create indexes
CREATE INDEX idx_fitness_goals_client_id ON public.fitness_goals(client_id);
CREATE INDEX idx_fitness_goals_trainer_id ON public.fitness_goals(trainer_id);
CREATE INDEX idx_fitness_goals_status ON public.fitness_goals(status);
CREATE INDEX idx_goal_milestones_goal_id ON public.goal_milestones(goal_id);

-- Trigger for updated_at
CREATE TRIGGER update_fitness_goals_updated_at
BEFORE UPDATE ON public.fitness_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();