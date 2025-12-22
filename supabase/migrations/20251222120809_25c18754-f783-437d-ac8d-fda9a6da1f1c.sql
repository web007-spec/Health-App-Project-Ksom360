-- Create health_data table for storing synced health metrics
CREATE TABLE public.health_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL CHECK (data_type IN ('heart_rate', 'calories_burned', 'steps', 'active_minutes', 'workout', 'resting_heart_rate')),
  value NUMERIC NOT NULL,
  unit TEXT,
  recorded_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('apple_health', 'samsung_health', 'google_fit', 'health_connect')),
  metadata JSONB DEFAULT '{}',
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create health_connections table to track connected health apps
CREATE TABLE public.health_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('apple_health', 'health_connect')),
  is_connected BOOLEAN DEFAULT FALSE,
  last_sync_at TIMESTAMPTZ,
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, provider)
);

-- Create indexes for performance
CREATE INDEX idx_health_data_client_id ON public.health_data(client_id);
CREATE INDEX idx_health_data_recorded_at ON public.health_data(recorded_at);
CREATE INDEX idx_health_data_type ON public.health_data(data_type);
CREATE INDEX idx_health_data_client_type_date ON public.health_data(client_id, data_type, recorded_at);
CREATE INDEX idx_health_connections_client_id ON public.health_connections(client_id);

-- Enable RLS on both tables
ALTER TABLE public.health_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for health_data
-- Clients can read and insert their own health data
CREATE POLICY "Clients can view their own health data"
  ON public.health_data
  FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can insert their own health data"
  ON public.health_data
  FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their own health data"
  ON public.health_data
  FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can delete their own health data"
  ON public.health_data
  FOR DELETE
  USING (auth.uid() = client_id);

-- Trainers can view health data of their assigned clients
CREATE POLICY "Trainers can view assigned clients health data"
  ON public.health_data
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.client_id = health_data.client_id
      AND tc.trainer_id = auth.uid()
    )
  );

-- RLS Policies for health_connections
-- Clients can manage their own connections
CREATE POLICY "Clients can view their own health connections"
  ON public.health_connections
  FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can insert their own health connections"
  ON public.health_connections
  FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their own health connections"
  ON public.health_connections
  FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can delete their own health connections"
  ON public.health_connections
  FOR DELETE
  USING (auth.uid() = client_id);

-- Trainers can view connection status of their assigned clients
CREATE POLICY "Trainers can view assigned clients health connections"
  ON public.health_connections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.client_id = health_connections.client_id
      AND tc.trainer_id = auth.uid()
    )
  );

-- Add trigger for updated_at on health_connections
CREATE TRIGGER update_health_connections_updated_at
  BEFORE UPDATE ON public.health_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for health_data so trainers see live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.health_data;