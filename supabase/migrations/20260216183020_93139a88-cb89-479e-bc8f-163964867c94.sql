
-- Table for trainer-customizable practice/game day cards (similar to rest day cards)
CREATE TABLE public.client_sport_day_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  trainer_id UUID NOT NULL,
  card_type TEXT NOT NULL CHECK (card_type IN ('practice', 'game')),
  image_url TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, card_type)
);

ALTER TABLE public.client_sport_day_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage sport day cards for their clients"
  ON public.client_sport_day_cards FOR ALL
  USING (
    trainer_id = auth.uid() OR client_id = auth.uid()
  )
  WITH CHECK (
    trainer_id = auth.uid()
  );

CREATE POLICY "Clients can view their own sport day cards"
  ON public.client_sport_day_cards FOR SELECT
  USING (client_id = auth.uid());
