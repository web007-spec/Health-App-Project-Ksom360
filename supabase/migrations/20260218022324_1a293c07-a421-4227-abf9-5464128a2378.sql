-- Create fasting protocols reference table
CREATE TABLE public.fasting_protocols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  duration_days INTEGER NOT NULL,
  fast_target_hours INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (public read, no public write)
ALTER TABLE public.fasting_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view fasting protocols"
ON public.fasting_protocols
FOR SELECT
USING (true);

-- Add protocol selection fields to client_feature_settings
ALTER TABLE public.client_feature_settings
ADD COLUMN selected_protocol_id UUID REFERENCES public.fasting_protocols(id),
ADD COLUMN protocol_start_date DATE;