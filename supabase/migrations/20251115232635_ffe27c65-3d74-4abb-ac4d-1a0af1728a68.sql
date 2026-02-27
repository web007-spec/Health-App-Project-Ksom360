-- Create enum for resource types
CREATE TYPE resource_type AS ENUM ('link', 'document', 'form');

-- Create enum for layout types
CREATE TYPE layout_type AS ENUM ('large_cards', 'narrow_cards', 'small_cards', 'list');

-- Create enum for workout label categories
CREATE TYPE label_category AS ENUM ('level', 'duration', 'intensity', 'type', 'body_part', 'location');

-- Create enum for on-demand workout types
CREATE TYPE ondemand_workout_type AS ENUM ('regular', 'video');

-- =============================================
-- RESOURCE COLLECTIONS TABLES
-- =============================================

-- Resources table - individual resources (links, documents, forms)
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type resource_type NOT NULL,
  url TEXT,
  file_path TEXT,
  cover_image_url TEXT,
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Resource collections table - groupings of resources
CREATE TABLE public.resource_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Collection sections table - sections within a collection
CREATE TABLE public.collection_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES resource_collections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  layout_type layout_type DEFAULT 'large_cards',
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Section resources junction table - links resources to sections
CREATE TABLE public.section_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES collection_sections(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  UNIQUE(section_id, resource_id)
);

-- Client collection access table - which clients can access which collections
CREATE TABLE public.client_collection_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES resource_collections(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(collection_id, client_id)
);

-- =============================================
-- WORKOUT COLLECTIONS TABLES
-- =============================================

-- Workout labels table - labels for categorizing workouts
CREATE TABLE public.workout_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category label_category NOT NULL,
  value TEXT NOT NULL,
  trainer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category, value, trainer_id)
);

-- On-demand workouts table
CREATE TABLE public.ondemand_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type ondemand_workout_type NOT NULL,
  workout_plan_id UUID REFERENCES workout_plans(id) ON DELETE SET NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workout labels junction table
CREATE TABLE public.workout_workout_labels (
  workout_id UUID NOT NULL REFERENCES ondemand_workouts(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES workout_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (workout_id, label_id)
);

-- Workout collections table
CREATE TABLE public.workout_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Collection categories table - categories within workout collections
CREATE TABLE public.workout_collection_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES workout_collections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  order_index INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Category workouts junction table
CREATE TABLE public.category_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES workout_collection_categories(id) ON DELETE CASCADE,
  workout_id UUID NOT NULL REFERENCES ondemand_workouts(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  UNIQUE(category_id, workout_id)
);

-- Client workout collection access table
CREATE TABLE public.client_workout_collection_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES workout_collections(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(collection_id, client_id)
);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_collection_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ondemand_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_workout_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_collection_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_workout_collection_access ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - RESOURCES
-- =============================================

CREATE POLICY "Trainers can manage their resources"
  ON public.resources FOR ALL
  USING (auth.uid() = trainer_id);

CREATE POLICY "Clients can view resources in their collections"
  ON public.resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM section_resources sr
      JOIN collection_sections cs ON sr.section_id = cs.id
      JOIN client_collection_access cca ON cs.collection_id = cca.collection_id
      WHERE sr.resource_id = resources.id AND cca.client_id = auth.uid()
    )
  );

-- =============================================
-- RLS POLICIES - RESOURCE COLLECTIONS
-- =============================================

CREATE POLICY "Trainers can manage their resource collections"
  ON public.resource_collections FOR ALL
  USING (auth.uid() = trainer_id);

CREATE POLICY "Clients can view their assigned collections"
  ON public.resource_collections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_collection_access
      WHERE collection_id = resource_collections.id AND client_id = auth.uid()
    )
  );

-- =============================================
-- RLS POLICIES - COLLECTION SECTIONS
-- =============================================

CREATE POLICY "Trainers can manage sections in their collections"
  ON public.collection_sections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM resource_collections
      WHERE id = collection_sections.collection_id AND trainer_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view sections in their collections"
  ON public.collection_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_collection_access cca
      WHERE cca.collection_id = collection_sections.collection_id AND cca.client_id = auth.uid()
    )
  );

-- =============================================
-- RLS POLICIES - SECTION RESOURCES
-- =============================================

CREATE POLICY "Trainers can manage section resources"
  ON public.section_resources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM collection_sections cs
      JOIN resource_collections rc ON cs.collection_id = rc.id
      WHERE cs.id = section_resources.section_id AND rc.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view section resources"
  ON public.section_resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collection_sections cs
      JOIN client_collection_access cca ON cs.collection_id = cca.collection_id
      WHERE cs.id = section_resources.section_id AND cca.client_id = auth.uid()
    )
  );

-- =============================================
-- RLS POLICIES - CLIENT COLLECTION ACCESS
-- =============================================

CREATE POLICY "Trainers can manage client access to their collections"
  ON public.client_collection_access FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM resource_collections
      WHERE id = client_collection_access.collection_id AND trainer_id = auth.uid()
    )
  );

-- =============================================
-- RLS POLICIES - WORKOUT LABELS
-- =============================================

CREATE POLICY "Trainers can manage their workout labels"
  ON public.workout_labels FOR ALL
  USING (auth.uid() = trainer_id OR is_default = true);

CREATE POLICY "Everyone can view workout labels"
  ON public.workout_labels FOR SELECT
  USING (true);

-- =============================================
-- RLS POLICIES - ONDEMAND WORKOUTS
-- =============================================

CREATE POLICY "Trainers can manage their on-demand workouts"
  ON public.ondemand_workouts FOR ALL
  USING (auth.uid() = trainer_id);

CREATE POLICY "Clients can view workouts in their collections"
  ON public.ondemand_workouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM category_workouts cw
      JOIN workout_collection_categories wcc ON cw.category_id = wcc.id
      JOIN client_workout_collection_access cwca ON wcc.collection_id = cwca.collection_id
      WHERE cw.workout_id = ondemand_workouts.id AND cwca.client_id = auth.uid()
    )
  );

-- =============================================
-- RLS POLICIES - WORKOUT WORKOUT LABELS
-- =============================================

CREATE POLICY "Trainers can manage workout labels"
  ON public.workout_workout_labels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM ondemand_workouts
      WHERE id = workout_workout_labels.workout_id AND trainer_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view workout labels"
  ON public.workout_workout_labels FOR SELECT
  USING (true);

-- =============================================
-- RLS POLICIES - WORKOUT COLLECTIONS
-- =============================================

CREATE POLICY "Trainers can manage their workout collections"
  ON public.workout_collections FOR ALL
  USING (auth.uid() = trainer_id);

CREATE POLICY "Clients can view their assigned workout collections"
  ON public.workout_collections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_workout_collection_access
      WHERE collection_id = workout_collections.id AND client_id = auth.uid()
    )
  );

-- =============================================
-- RLS POLICIES - WORKOUT COLLECTION CATEGORIES
-- =============================================

CREATE POLICY "Trainers can manage categories in their collections"
  ON public.workout_collection_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workout_collections
      WHERE id = workout_collection_categories.collection_id AND trainer_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view categories in their collections"
  ON public.workout_collection_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_workout_collection_access cwca
      WHERE cwca.collection_id = workout_collection_categories.collection_id AND cwca.client_id = auth.uid()
    )
  );

-- =============================================
-- RLS POLICIES - CATEGORY WORKOUTS
-- =============================================

CREATE POLICY "Trainers can manage category workouts"
  ON public.category_workouts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workout_collection_categories wcc
      JOIN workout_collections wc ON wcc.collection_id = wc.id
      WHERE wcc.id = category_workouts.category_id AND wc.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view category workouts"
  ON public.category_workouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workout_collection_categories wcc
      JOIN client_workout_collection_access cwca ON wcc.collection_id = cwca.collection_id
      WHERE wcc.id = category_workouts.category_id AND cwca.client_id = auth.uid()
    )
  );

-- =============================================
-- RLS POLICIES - CLIENT WORKOUT COLLECTION ACCESS
-- =============================================

CREATE POLICY "Trainers can manage client access to workout collections"
  ON public.client_workout_collection_access FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workout_collections
      WHERE id = client_workout_collection_access.collection_id AND trainer_id = auth.uid()
    )
  );

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_resource_collections_updated_at
  BEFORE UPDATE ON public.resource_collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ondemand_workouts_updated_at
  BEFORE UPDATE ON public.ondemand_workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_workout_collections_updated_at
  BEFORE UPDATE ON public.workout_collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- INSERT DEFAULT WORKOUT LABELS
-- =============================================

-- Level labels
INSERT INTO public.workout_labels (category, value, is_default) VALUES
  ('level', 'All levels', true),
  ('level', 'Beginner', true),
  ('level', 'Intermediate', true),
  ('level', 'Advanced', true);

-- Duration labels
INSERT INTO public.workout_labels (category, value, is_default) VALUES
  ('duration', '5 min', true),
  ('duration', '10 min', true),
  ('duration', '15 min', true),
  ('duration', '20 min', true),
  ('duration', '30 min', true),
  ('duration', '45 min', true),
  ('duration', '60 min', true),
  ('duration', '60+ min', true);