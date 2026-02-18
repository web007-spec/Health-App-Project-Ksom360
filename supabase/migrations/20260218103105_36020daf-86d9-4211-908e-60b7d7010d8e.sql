
ALTER TABLE public.client_feature_settings
ADD COLUMN greeting_emoji text NOT NULL DEFAULT '👋',
ADD COLUMN greeting_subtitle text NOT NULL DEFAULT 'Let''s do this',
ADD COLUMN fasting_card_subtitle text NOT NULL DEFAULT 'Fasting is the foundation of your KSOM360 plan.',
ADD COLUMN dashboard_hero_image_url text,
ADD COLUMN dashboard_hero_message text;
