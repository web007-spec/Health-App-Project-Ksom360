
-- Drop the existing unrestricted client update policy and replace with one that checks feature flag
DROP POLICY IF EXISTS "Clients can update their current progress" ON public.fitness_goals;

-- Client can UPDATE goal only if client_can_edit_goal = true in client_feature_settings
CREATE POLICY "Client can update goal if allowed"
ON public.fitness_goals
FOR UPDATE
USING (
  client_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM client_feature_settings
    WHERE client_feature_settings.client_id = auth.uid()
    AND client_feature_settings.client_can_edit_goal = true
  )
)
WITH CHECK (
  client_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM client_feature_settings
    WHERE client_feature_settings.client_id = auth.uid()
    AND client_feature_settings.client_can_edit_goal = true
  )
);

-- Client can INSERT a goal only if client_can_edit_goal = true
CREATE POLICY "Client can create goal if allowed"
ON public.fitness_goals
FOR INSERT
WITH CHECK (
  client_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM client_feature_settings
    WHERE client_feature_settings.client_id = auth.uid()
    AND client_feature_settings.client_can_edit_goal = true
  )
);
