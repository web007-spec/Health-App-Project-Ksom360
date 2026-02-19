CREATE OR REPLACE FUNCTION public.auto_provision_progress_tiles()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.role = 'client' THEN
    PERFORM provision_default_progress_tiles(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_provision_progress_tiles
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_provision_progress_tiles();