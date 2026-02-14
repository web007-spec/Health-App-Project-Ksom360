
-- Workout sessions: tracks completed workout sessions with duration and rating
CREATE TABLE public.workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_workout_id uuid REFERENCES public.client_workouts(id) ON DELETE CASCADE NOT NULL,
  client_id uuid NOT NULL,
  workout_plan_id uuid REFERENCES public.workout_plans(id) NOT NULL,
  started_at timestamp with time zone NOT NULL,
  completed_at timestamp with time zone,
  duration_seconds integer,
  difficulty_rating integer CHECK (difficulty_rating BETWEEN 1 AND 5),
  notes text,
  is_partial boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their workout sessions"
  ON public.workout_sessions FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can insert their workout sessions"
  ON public.workout_sessions FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their workout sessions"
  ON public.workout_sessions FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "Trainers can view client workout sessions"
  ON public.workout_sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM trainer_clients tc
    WHERE tc.client_id = workout_sessions.client_id AND tc.trainer_id = auth.uid()
  ));

-- Exercise logs: per-set tracking within a session
CREATE TABLE public.workout_exercise_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.workout_sessions(id) ON DELETE CASCADE NOT NULL,
  exercise_id uuid REFERENCES public.exercises(id) NOT NULL,
  set_number integer NOT NULL,
  reps integer,
  weight numeric,
  duration_seconds integer,
  completed boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.workout_exercise_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can manage their exercise logs"
  ON public.workout_exercise_logs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workout_sessions ws
    WHERE ws.id = workout_exercise_logs.session_id AND ws.client_id = auth.uid()
  ));

CREATE POLICY "Trainers can view client exercise logs"
  ON public.workout_exercise_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workout_sessions ws
    JOIN trainer_clients tc ON tc.client_id = ws.client_id
    WHERE ws.id = workout_exercise_logs.session_id AND tc.trainer_id = auth.uid()
  ));

-- Workout comments: thread between client and trainer on completed workouts
CREATE TABLE public.workout_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.workout_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.workout_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workout comments"
  ON public.workout_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workout_sessions ws
    WHERE ws.id = workout_comments.session_id
    AND (ws.client_id = auth.uid() OR EXISTS (
      SELECT 1 FROM trainer_clients tc
      WHERE tc.client_id = ws.client_id AND tc.trainer_id = auth.uid()
    ))
  ));

CREATE POLICY "Users can insert workout comments"
  ON public.workout_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM workout_sessions ws
    WHERE ws.id = workout_comments.session_id
    AND (ws.client_id = auth.uid() OR EXISTS (
      SELECT 1 FROM trainer_clients tc
      WHERE tc.client_id = ws.client_id AND tc.trainer_id = auth.uid()
    ))
  ));

-- Badge definitions
CREATE TABLE public.badge_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT '🏆',
  badge_type text NOT NULL, -- 'streak', 'milestone', 'difficulty'
  requirement_value integer NOT NULL, -- e.g. 3 for 3-day streak, 10 for 10 workouts
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view badge definitions"
  ON public.badge_definitions FOR SELECT
  USING (true);

-- Client earned badges
CREATE TABLE public.client_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  badge_id uuid REFERENCES public.badge_definitions(id) ON DELETE CASCADE NOT NULL,
  earned_at timestamp with time zone DEFAULT now(),
  session_id uuid REFERENCES public.workout_sessions(id),
  UNIQUE(client_id, badge_id)
);

ALTER TABLE public.client_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their badges"
  ON public.client_badges FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "System can insert badges for clients"
  ON public.client_badges FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Trainers can view client badges"
  ON public.client_badges FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM trainer_clients tc
    WHERE tc.client_id = client_badges.client_id AND tc.trainer_id = auth.uid()
  ));

-- Seed default badge definitions
INSERT INTO public.badge_definitions (name, description, icon, badge_type, requirement_value) VALUES
  ('First Workout', 'Complete your first workout', '🎯', 'milestone', 1),
  ('Getting Started', 'Complete 5 workouts', '💪', 'milestone', 5),
  ('Dedicated', 'Complete 10 workouts', '🔥', 'milestone', 10),
  ('Unstoppable', 'Complete 25 workouts', '⚡', 'milestone', 25),
  ('Century Club', 'Complete 50 workouts', '🏆', 'milestone', 50),
  ('Legend', 'Complete 100 workouts', '👑', 'milestone', 100),
  ('3-Day Streak', 'Work out 3 days in a row', '🔥', 'streak', 3),
  ('7-Day Streak', 'Work out 7 days in a row', '🔥', 'streak', 7),
  ('14-Day Streak', 'Work out 14 days in a row', '💎', 'streak', 14),
  ('30-Day Streak', 'Work out 30 days in a row', '🏅', 'streak', 30),
  ('Iron Will', 'Complete 5 advanced workouts', '🦾', 'difficulty', 5),
  ('Beast Mode', 'Complete 10 advanced workouts', '🐉', 'difficulty', 10),
  ('Warrior', 'Complete 20 advanced workouts', '⚔️', 'difficulty', 20);

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_comments;
