
-- Add foreign keys to appointments table for proper joins
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.profiles(id),
  ADD CONSTRAINT appointments_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.profiles(id);

-- Add foreign keys to other tables missing them
ALTER TABLE public.trainer_availability
  ADD CONSTRAINT trainer_availability_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.profiles(id);

ALTER TABLE public.trainer_date_overrides
  ADD CONSTRAINT trainer_date_overrides_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.profiles(id);

ALTER TABLE public.trainer_vacations
  ADD CONSTRAINT trainer_vacations_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.profiles(id);

ALTER TABLE public.booking_settings
  ADD CONSTRAINT booking_settings_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.profiles(id);

ALTER TABLE public.google_calendar_connections
  ADD CONSTRAINT google_calendar_connections_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.profiles(id);

ALTER TABLE public.appointment_types
  ADD CONSTRAINT appointment_types_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.profiles(id);
