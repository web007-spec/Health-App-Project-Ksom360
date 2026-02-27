
-- Allow trainer_id to be nullable for client-set macros
ALTER TABLE public.client_macro_targets ALTER COLUMN trainer_id DROP NOT NULL;

-- Allow clients to insert their own macro targets
CREATE POLICY "Clients can insert their own macro targets"
ON public.client_macro_targets
FOR INSERT
WITH CHECK (auth.uid() = client_id);

-- Allow clients to update their own macro targets
CREATE POLICY "Clients can update their own macro targets"
ON public.client_macro_targets
FOR UPDATE
USING (auth.uid() = client_id);
