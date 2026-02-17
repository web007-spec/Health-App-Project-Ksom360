
-- Group class definitions (recurring or one-off)
CREATE TABLE public.group_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#8b5cf6',
  max_capacity INTEGER NOT NULL DEFAULT 10,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  location TEXT,
  location_type TEXT NOT NULL DEFAULT 'in_person',
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  -- For recurring: day_of_week (0=Sun..6=Sat), start_time
  recurrence_day INTEGER,
  recurrence_time TIME,
  -- For one-off: not recurring, sessions created manually
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.group_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage own group classes"
  ON public.group_classes FOR ALL
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Clients can view trainer group classes"
  ON public.group_classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = group_classes.trainer_id
        AND tc.client_id = auth.uid()
        AND tc.status = 'active'
    )
  );

-- Individual class sessions (generated from recurring or created manually)
CREATE TABLE public.group_class_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.group_classes(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 10,
  is_cancelled BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.group_class_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage own class sessions"
  ON public.group_class_sessions FOR ALL
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Clients can view trainer class sessions"
  ON public.group_class_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = group_class_sessions.trainer_id
        AND tc.client_id = auth.uid()
        AND tc.status = 'active'
    )
  );

-- Client bookings for class sessions
CREATE TABLE public.group_class_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.group_class_sessions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed',
  booked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  UNIQUE(session_id, client_id)
);

ALTER TABLE public.group_class_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients manage own class bookings"
  ON public.group_class_bookings FOR ALL
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Trainers view bookings for own sessions"
  ON public.group_class_bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_class_sessions gcs
      WHERE gcs.id = group_class_bookings.session_id
        AND gcs.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can delete bookings for own sessions"
  ON public.group_class_bookings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_class_sessions gcs
      WHERE gcs.id = group_class_bookings.session_id
        AND gcs.trainer_id = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_group_classes_updated_at
  BEFORE UPDATE ON public.group_classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
