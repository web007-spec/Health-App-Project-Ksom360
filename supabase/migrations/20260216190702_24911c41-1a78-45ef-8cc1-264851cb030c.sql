
ALTER TABLE public.sport_event_completions
ADD CONSTRAINT sport_event_completions_sport_event_id_fkey
FOREIGN KEY (sport_event_id) REFERENCES public.sport_schedule_events(id) ON DELETE CASCADE;
