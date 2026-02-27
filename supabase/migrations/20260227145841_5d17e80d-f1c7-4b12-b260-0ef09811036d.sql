-- Allow multiple sports per client/trainer while keeping each sport unique
ALTER TABLE public.client_sport_profiles
DROP CONSTRAINT IF EXISTS client_sport_profiles_client_id_trainer_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'client_sport_profiles_client_id_trainer_id_sport_key'
      AND conrelid = 'public.client_sport_profiles'::regclass
  ) THEN
    ALTER TABLE public.client_sport_profiles
    ADD CONSTRAINT client_sport_profiles_client_id_trainer_id_sport_key
    UNIQUE (client_id, trainer_id, sport);
  END IF;
END $$;