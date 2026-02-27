-- Add category column to exercises table
ALTER TABLE exercises ADD COLUMN category TEXT;

-- Add an index for better performance on category filtering
CREATE INDEX idx_exercises_category ON exercises(category);