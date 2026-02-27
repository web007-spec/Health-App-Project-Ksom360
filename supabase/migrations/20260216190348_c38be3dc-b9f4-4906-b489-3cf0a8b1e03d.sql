
-- Table to track sport event completions (practice/game)
CREATE TABLE public.sport_event_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  sport_event_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'incomplete', 'missed'
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sport_event_completions ENABLE ROW LEVEL SECURITY;

-- Clients can manage their own sport event completions
CREATE POLICY "Clients can manage their sport event completions"
ON public.sport_event_completions
FOR ALL
USING (auth.uid() = client_id)
WITH CHECK (auth.uid() = client_id);

-- Trainers can view their clients' sport event completions
CREATE POLICY "Trainers can view client sport event completions"
ON public.sport_event_completions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM trainer_clients tc
  WHERE tc.client_id = sport_event_completions.client_id
  AND tc.trainer_id = auth.uid()
));
