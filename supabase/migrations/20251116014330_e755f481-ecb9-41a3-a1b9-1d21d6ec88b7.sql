-- Create exercise_tags table
CREATE TABLE exercise_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trainer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, trainer_id)
);

-- Create junction table for exercise-tag relationships
CREATE TABLE exercise_exercise_tags (
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES exercise_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (exercise_id, tag_id)
);

-- Enable RLS
ALTER TABLE exercise_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_exercise_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exercise_tags
CREATE POLICY "Trainers can manage their exercise tags"
ON exercise_tags
FOR ALL
USING (auth.uid() = trainer_id OR is_default = true);

CREATE POLICY "Everyone can view exercise tags"
ON exercise_tags
FOR SELECT
USING (true);

-- RLS Policies for exercise_exercise_tags
CREATE POLICY "Trainers can manage exercise tags"
ON exercise_exercise_tags
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM exercises
    WHERE exercises.id = exercise_exercise_tags.exercise_id
    AND exercises.trainer_id = auth.uid()
  )
);

CREATE POLICY "Everyone can view exercise tags"
ON exercise_exercise_tags
FOR SELECT
USING (true);

-- Insert default tags
INSERT INTO exercise_tags (name, is_default) VALUES
  ('client favorite', true),
  ('low impact', true),
  ('home workout', true),
  ('beginner friendly', true),
  ('advanced', true),
  ('quick session', true),
  ('no equipment', true);

-- Add index for better performance
CREATE INDEX idx_exercise_tags_trainer ON exercise_tags(trainer_id);
CREATE INDEX idx_exercise_exercise_tags_exercise ON exercise_exercise_tags(exercise_id);
CREATE INDEX idx_exercise_exercise_tags_tag ON exercise_exercise_tags(tag_id);