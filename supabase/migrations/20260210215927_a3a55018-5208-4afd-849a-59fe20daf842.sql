
-- Fix: Always set role to 'client' for new users, ignoring user-controlled metadata
-- Trainer role should be assigned through a separate admin process
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'client'::user_role
  );
  RETURN NEW;
END;
$$;
