
-- Add difficulty_level column to fasting_protocols
ALTER TABLE public.fasting_protocols ADD COLUMN IF NOT EXISTS difficulty_level text DEFAULT 'beginner';

-- Update existing categories to match the reference design
UPDATE public.fasting_protocols SET category = 'JUST EXPLORING' WHERE category = 'FOUNDATIONS' AND name = '7-Day Fasting Kickstart';
UPDATE public.fasting_protocols SET category = 'LOSE WEIGHT' WHERE category = 'FOUNDATIONS' AND name = '14-Day Weight Kickstart';
UPDATE public.fasting_protocols SET category = 'LOSE WEIGHT' WHERE category = 'FAT LOSS';
UPDATE public.fasting_protocols SET category = 'BOOST ENERGY' WHERE category = 'ENERGY & FOCUS';
UPDATE public.fasting_protocols SET category = 'POPULAR SCHEDULES' WHERE name = '30-Day Progressive';

-- Set difficulty levels for existing protocols
UPDATE public.fasting_protocols SET difficulty_level = 'beginner' WHERE name IN ('7-Day Fasting Kickstart', '14-Day Weight Kickstart', '7-Day Energy Reset');
UPDATE public.fasting_protocols SET difficulty_level = 'intermediate' WHERE name IN ('21-Day Fat Loss Ladder', '14-Day Steady Energy', '21-Day Rhythm Restore');
UPDATE public.fasting_protocols SET difficulty_level = 'experienced' WHERE name IN ('28-Day Metabolic Reset', '30-Day Progressive');

-- Add SHARPEN FOCUS protocols
INSERT INTO public.fasting_protocols (name, category, description, duration_days, fast_target_hours, difficulty_level) VALUES
('14-Day Morning Clarity', 'SHARPEN FOCUS', 'Aligns your fasting window with peak morning cortisol to eliminate brain fog and sustain mental clarity.', 14, 14, 'beginner'),
('21-Day Deep Focus', 'SHARPEN FOCUS', 'Optimized for the workday. Uses ketone production to fuel deep cognitive tasks while keeping weekends flexible.', 21, 16, 'intermediate'),
('28-Day Flow State', 'SHARPEN FOCUS', 'Training your brain to run on ketones for sustained 4-hour blocks of high-performance ''Flow State''.', 28, 18, 'experienced');

-- Add GET HEALTHIER protocols
INSERT INTO public.fasting_protocols (name, category, description, duration_days, fast_target_hours, difficulty_level) VALUES
('14-Day Health Foundations', 'GET HEALTHIER', 'Establishes a consistent rhythm to lower systemic inflammation and give your gut lining daily repair time.', 14, 14, 'beginner'),
('28-Day Health Reset', 'GET HEALTHIER', 'A comprehensive 4-week reset to normalize insulin sensitivity and restore your natural hunger cues.', 28, 16, 'intermediate'),
('28-Day Advanced Health Protocol', 'GET HEALTHIER', 'Leverages longer 18-hour windows to trigger Autophagy—your body''s cellular cleanup and renewal process.', 28, 18, 'experienced');

-- Add POPULAR SCHEDULES protocols
INSERT INTO public.fasting_protocols (name, category, description, duration_days, fast_target_hours, difficulty_level) VALUES
('5:2 Diet', 'POPULAR SCHEDULES', 'Fast 2 days a week, eat normally the other 5', 0, 24, 'beginner'),
('16:8 Weekdays', 'POPULAR SCHEDULES', 'Work week structure, flexible weekends', 0, 16, 'beginner'),
('Crescendo Fasting', 'POPULAR SCHEDULES', 'Gentle approach designed for hormonal balance', 0, 16, 'beginner'),
('4:3 Diet', 'POPULAR SCHEDULES', 'Fast 3 days, enjoy 4 days - powerful results', 0, 24, 'intermediate'),
('Alternate Day', 'POPULAR SCHEDULES', 'Fast every other day - scientifically proven method', 14, 24, 'experienced'),
('Eat-Stop-Eat', 'POPULAR SCHEDULES', 'Flexible 24-hour fasts twice per week', 0, 24, 'intermediate'),
('Weekend Warrior', 'POPULAR SCHEDULES', 'Extended fasts on weekends only', 0, 20, 'beginner');
