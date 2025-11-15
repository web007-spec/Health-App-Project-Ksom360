-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('trainer', 'client');

-- Create enum for workout difficulty
CREATE TYPE workout_difficulty AS ENUM ('beginner', 'intermediate', 'advanced');

-- Create enum for client status
CREATE TYPE client_status AS ENUM ('active', 'paused', 'pending');

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'client',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trainer-Client relationship
CREATE TABLE trainer_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status client_status NOT NULL DEFAULT 'pending',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trainer_id, client_id)
);

-- Workout plans/templates
CREATE TABLE workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  difficulty workout_difficulty NOT NULL,
  duration_minutes INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exercise library
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  muscle_group TEXT,
  equipment TEXT,
  video_url TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workout plan exercises (junction table)
CREATE TABLE workout_plan_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  sets INTEGER,
  reps INTEGER,
  duration_seconds INTEGER,
  rest_seconds INTEGER,
  notes TEXT
);

-- Assigned workouts to clients
CREATE TABLE client_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workout_plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_date DATE,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Progress tracking
CREATE TABLE progress_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight DECIMAL(5,2),
  body_fat_percentage DECIMAL(4,2),
  measurements JSONB,
  photos JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Nutrition logs
CREATE TABLE nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_name TEXT NOT NULL,
  calories INTEGER,
  protein DECIMAL(6,2),
  carbs DECIMAL(6,2),
  fats DECIMAL(6,2),
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages between trainer and client
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for trainer_clients
CREATE POLICY "Trainers can view their clients"
  ON trainer_clients FOR SELECT
  USING (auth.uid() = trainer_id OR auth.uid() = client_id);

CREATE POLICY "Trainers can manage their clients"
  ON trainer_clients FOR ALL
  USING (auth.uid() = trainer_id);

-- RLS Policies for workout_plans
CREATE POLICY "Trainers can manage their workout plans"
  ON workout_plans FOR ALL
  USING (auth.uid() = trainer_id);

CREATE POLICY "Clients can view assigned workout plans"
  ON workout_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_workouts cw
      WHERE cw.workout_plan_id = workout_plans.id
      AND cw.client_id = auth.uid()
    )
  );

-- RLS Policies for exercises
CREATE POLICY "Trainers can manage their exercises"
  ON exercises FOR ALL
  USING (auth.uid() = trainer_id);

-- RLS Policies for workout_plan_exercises
CREATE POLICY "Users can view workout exercises"
  ON workout_plan_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workout_plans wp
      WHERE wp.id = workout_plan_exercises.workout_plan_id
      AND (wp.trainer_id = auth.uid() OR EXISTS (
        SELECT 1 FROM client_workouts cw
        WHERE cw.workout_plan_id = wp.id
        AND cw.client_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Trainers can manage workout exercises"
  ON workout_plan_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workout_plans wp
      WHERE wp.id = workout_plan_exercises.workout_plan_id
      AND wp.trainer_id = auth.uid()
    )
  );

-- RLS Policies for client_workouts
CREATE POLICY "Users can view their workouts"
  ON client_workouts FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = assigned_by);

CREATE POLICY "Trainers can assign workouts"
  ON client_workouts FOR INSERT
  WITH CHECK (auth.uid() = assigned_by);

CREATE POLICY "Clients can update their workouts"
  ON client_workouts FOR UPDATE
  USING (auth.uid() = client_id);

-- RLS Policies for progress_entries
CREATE POLICY "Clients can manage their progress"
  ON progress_entries FOR ALL
  USING (auth.uid() = client_id);

CREATE POLICY "Trainers can view client progress"
  ON progress_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trainer_clients tc
      WHERE tc.client_id = progress_entries.client_id
      AND tc.trainer_id = auth.uid()
    )
  );

-- RLS Policies for nutrition_logs
CREATE POLICY "Clients can manage their nutrition logs"
  ON nutrition_logs FOR ALL
  USING (auth.uid() = client_id);

CREATE POLICY "Trainers can view client nutrition"
  ON nutrition_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trainer_clients tc
      WHERE tc.client_id = nutrition_logs.client_id
      AND tc.trainer_id = auth.uid()
    )
  );

-- RLS Policies for messages
CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update read status"
  ON messages FOR UPDATE
  USING (auth.uid() = recipient_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_workout_plans_updated_at
  BEFORE UPDATE ON workout_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();