
-- Table to store iCal feed URLs per client
CREATE TABLE public.client_ical_feeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  trainer_id UUID NOT NULL,
  feed_url TEXT NOT NULL,
  feed_name TEXT NOT NULL DEFAULT 'TeamSnap',
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_error TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to store parsed sport schedule events
CREATE TABLE public.sport_schedule_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_id UUID NOT NULL REFERENCES public.client_ical_feeds(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  event_uid TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'event',
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  all_day BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(feed_id, event_uid)
);

-- RLS for client_ical_feeds
ALTER TABLE public.client_ical_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage client iCal feeds"
  ON public.client_ical_feeds FOR ALL
  USING (auth.uid() = trainer_id);

CREATE POLICY "Clients can view their iCal feeds"
  ON public.client_ical_feeds FOR SELECT
  USING (auth.uid() = client_id);

-- RLS for sport_schedule_events
ALTER TABLE public.sport_schedule_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage sport schedule events"
  ON public.sport_schedule_events FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.client_ical_feeds f
    WHERE f.id = sport_schedule_events.feed_id AND f.trainer_id = auth.uid()
  ));

CREATE POLICY "Clients can view their sport schedule events"
  ON public.sport_schedule_events FOR SELECT
  USING (auth.uid() = client_id);

-- Indexes
CREATE INDEX idx_sport_schedule_events_client_start ON public.sport_schedule_events(client_id, start_time);
CREATE INDEX idx_client_ical_feeds_client ON public.client_ical_feeds(client_id);

-- Update trigger
CREATE TRIGGER update_client_ical_feeds_updated_at
  BEFORE UPDATE ON public.client_ical_feeds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
