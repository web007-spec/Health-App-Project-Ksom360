
-- Remove overly permissive policy
DROP POLICY "Service can manage scores" ON public.engine_scores;

-- Replace with insert/update policies scoped to authenticated users for their own data
-- (Edge function will use service role key which bypasses RLS)
CREATE POLICY "Clients can upsert own scores"
  ON public.engine_scores FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update own scores"
  ON public.engine_scores FOR UPDATE
  USING (auth.uid() = client_id);
