UPDATE dashboard_card_layouts 
SET cards = jsonb_set(
  cards::jsonb, 
  '{0,visible}', 
  'true'::jsonb
)
WHERE id = '15bb05ab-6189-4ffa-9bf2-91f767db5daf';