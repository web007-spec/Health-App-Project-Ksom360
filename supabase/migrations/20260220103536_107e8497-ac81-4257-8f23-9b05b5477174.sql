ALTER TABLE public.health_data 
ADD CONSTRAINT health_data_client_id_data_type_recorded_at_key 
UNIQUE (client_id, data_type, recorded_at);