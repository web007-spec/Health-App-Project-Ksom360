
-- Create table for eating window meal slideshow photos
CREATE TABLE public.eating_window_meal_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  trainer_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.eating_window_meal_photos ENABLE ROW LEVEL SECURITY;

-- Trainer can manage photos for their clients
CREATE POLICY "Trainers can manage meal photos for their clients"
ON public.eating_window_meal_photos
FOR ALL
USING (
  trainer_id = auth.uid()
  OR client_id = auth.uid()
);
