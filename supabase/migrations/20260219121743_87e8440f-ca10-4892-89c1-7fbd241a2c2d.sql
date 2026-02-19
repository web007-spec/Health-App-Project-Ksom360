CREATE OR REPLACE FUNCTION public.provision_default_progress_tiles(p_client_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO client_progress_tiles (client_id, tile_key, label, unit, order_index, metric_definition_id)
  VALUES
    (p_client_id, 'body_weight', 'Weight', 'lbs', 0, (SELECT id FROM metric_definitions WHERE name = 'Weight' AND is_default = true LIMIT 1)),
    (p_client_id, 'body_fat', 'Body Fat', '%', 1, (SELECT id FROM metric_definitions WHERE name = 'Body Fat' AND is_default = true LIMIT 1)),
    (p_client_id, 'steps', 'Steps', 'steps', 2, (SELECT id FROM metric_definitions WHERE name = 'Steps' AND is_default = true LIMIT 1)),
    (p_client_id, 'resting_hr', 'Heart Rate', 'bpm', 3, (SELECT id FROM metric_definitions WHERE name = 'Heart Rate' AND is_default = true LIMIT 1)),
    (p_client_id, 'sleep', 'Sleep', 'hrs', 4, (SELECT id FROM metric_definitions WHERE name = 'Sleep' AND is_default = true LIMIT 1)),
    (p_client_id, 'caloric_intake', 'Caloric Intake', 'cal', 5, (SELECT id FROM metric_definitions WHERE name = 'Caloric Intake' AND is_default = true LIMIT 1)),
    (p_client_id, 'caloric_burn', 'Caloric Burn', 'cal', 6, (SELECT id FROM metric_definitions WHERE name = 'Caloric Burn' LIMIT 1))
  ON CONFLICT (client_id, tile_key) DO NOTHING;
END;
$function$;