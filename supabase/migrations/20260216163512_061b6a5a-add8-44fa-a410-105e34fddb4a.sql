
-- Appointment Types (trainer-defined: 1-on-1, Virtual, Nutrition, custom)
CREATE TABLE public.appointment_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  location_type TEXT NOT NULL DEFAULT 'in_person', -- in_person, virtual, both
  color TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointment_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage their appointment types"
  ON public.appointment_types FOR ALL
  USING (auth.uid() = trainer_id);

CREATE POLICY "Clients can view their trainers appointment types"
  ON public.appointment_types FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM trainer_clients tc
    WHERE tc.trainer_id = appointment_types.trainer_id
    AND tc.client_id = auth.uid()
    AND tc.status = 'active'
  ));

-- Trainer Weekly Availability (recurring schedule)
CREATE TABLE public.trainer_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL,
  appointment_type_id UUID REFERENCES public.appointment_types(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_general BOOLEAN NOT NULL DEFAULT true, -- true = applies to all types without specific availability
  location TEXT, -- optional location name
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trainer_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage their availability"
  ON public.trainer_availability FOR ALL
  USING (auth.uid() = trainer_id);

CREATE POLICY "Clients can view their trainers availability"
  ON public.trainer_availability FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM trainer_clients tc
    WHERE tc.trainer_id = trainer_availability.trainer_id
    AND tc.client_id = auth.uid()
    AND tc.status = 'active'
  ));

-- Date-specific overrides (different hours on a specific date, or mark as unavailable)
CREATE TABLE public.trainer_date_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL,
  override_date DATE NOT NULL,
  start_time TIME, -- null if is_unavailable = true
  end_time TIME,   -- null if is_unavailable = true
  is_unavailable BOOLEAN NOT NULL DEFAULT false, -- true = blocked off entirely
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trainer_date_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage their date overrides"
  ON public.trainer_date_overrides FOR ALL
  USING (auth.uid() = trainer_id);

CREATE POLICY "Clients can view their trainers date overrides"
  ON public.trainer_date_overrides FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM trainer_clients tc
    WHERE tc.trainer_id = trainer_date_overrides.trainer_id
    AND tc.client_id = auth.uid()
    AND tc.status = 'active'
  ));

-- Trainer Vacations / Time Off
CREATE TABLE public.trainer_vacations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trainer_vacations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage their vacations"
  ON public.trainer_vacations FOR ALL
  USING (auth.uid() = trainer_id);

CREATE POLICY "Clients can view their trainers vacations"
  ON public.trainer_vacations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM trainer_clients tc
    WHERE tc.trainer_id = trainer_vacations.trainer_id
    AND tc.client_id = auth.uid()
    AND tc.status = 'active'
  ));

-- Booked Appointments
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL,
  client_id UUID NOT NULL,
  appointment_type_id UUID REFERENCES public.appointment_types(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed', -- confirmed, cancelled, completed, no_show
  notes TEXT,
  location TEXT,
  cancelled_by UUID,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  google_event_id TEXT, -- for Google Calendar sync
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage appointments"
  ON public.appointments FOR ALL
  USING (auth.uid() = trainer_id);

CREATE POLICY "Clients can view their appointments"
  ON public.appointments FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can insert appointments (self-booking)"
  ON public.appointments FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can cancel their appointments"
  ON public.appointments FOR UPDATE
  USING (auth.uid() = client_id);

-- Google Calendar Connections (trainer-only)
CREATE TABLE public.google_calendar_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL UNIQUE,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_id TEXT DEFAULT 'primary',
  sync_to_google BOOLEAN NOT NULL DEFAULT true,
  sync_from_google BOOLEAN NOT NULL DEFAULT true,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage their Google Calendar connection"
  ON public.google_calendar_connections FOR ALL
  USING (auth.uid() = trainer_id);

-- Booking Settings (per trainer)
CREATE TABLE public.booking_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL UNIQUE,
  booking_window_days INTEGER NOT NULL DEFAULT 30, -- how far ahead clients can book
  min_notice_hours INTEGER NOT NULL DEFAULT 24, -- minimum notice for booking
  cancellation_notice_hours INTEGER NOT NULL DEFAULT 24, -- minimum notice for cancellation
  buffer_minutes INTEGER NOT NULL DEFAULT 15, -- buffer between appointments
  max_daily_appointments INTEGER, -- optional daily limit
  allow_self_booking BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage their booking settings"
  ON public.booking_settings FOR ALL
  USING (auth.uid() = trainer_id);

CREATE POLICY "Clients can view their trainers booking settings"
  ON public.booking_settings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM trainer_clients tc
    WHERE tc.trainer_id = booking_settings.trainer_id
    AND tc.client_id = auth.uid()
    AND tc.status = 'active'
  ));

-- Triggers for updated_at
CREATE TRIGGER update_appointment_types_updated_at
  BEFORE UPDATE ON public.appointment_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_google_calendar_connections_updated_at
  BEFORE UPDATE ON public.google_calendar_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_booking_settings_updated_at
  BEFORE UPDATE ON public.booking_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for appointments (so both trainer and client see updates live)
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
