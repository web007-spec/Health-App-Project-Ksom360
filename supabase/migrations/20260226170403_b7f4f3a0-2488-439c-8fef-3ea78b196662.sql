-- Move incorrectly synced health data from trainer to Andre Howard
UPDATE health_data SET client_id = '26c748e0-c726-40a3-a049-cc82eaf6fd45' WHERE client_id = '74d00d92-ac01-4363-a8f5-46cfdf54b7fb' AND source = 'apple_health';

-- Move health connection record  
UPDATE health_connections SET client_id = '26c748e0-c726-40a3-a049-cc82eaf6fd45' WHERE client_id = '74d00d92-ac01-4363-a8f5-46cfdf54b7fb' AND provider = 'apple_health';