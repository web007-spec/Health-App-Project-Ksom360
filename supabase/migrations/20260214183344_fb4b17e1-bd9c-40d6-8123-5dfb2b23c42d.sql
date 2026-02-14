
-- Create rest day cards table
CREATE TABLE public.client_rest_day_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  trainer_id UUID NOT NULL,
  message TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

ALTER TABLE public.client_rest_day_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their rest day card"
ON public.client_rest_day_cards FOR SELECT
USING (auth.uid() = client_id);

CREATE POLICY "Trainers can manage rest day cards"
ON public.client_rest_day_cards FOR ALL
USING (auth.uid() = trainer_id);

CREATE TRIGGER update_client_rest_day_cards_updated_at
BEFORE UPDATE ON public.client_rest_day_cards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Storage bucket for rest day images
INSERT INTO storage.buckets (id, name, public) VALUES ('rest-day-images', 'rest-day-images', true);

CREATE POLICY "Trainers can upload rest day images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'rest-day-images' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view rest day images"
ON storage.objects FOR SELECT
USING (bucket_id = 'rest-day-images');

CREATE POLICY "Trainers can update rest day images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'rest-day-images' AND auth.role() = 'authenticated');

CREATE POLICY "Trainers can delete rest day images"
ON storage.objects FOR DELETE
USING (bucket_id = 'rest-day-images' AND auth.role() = 'authenticated');
