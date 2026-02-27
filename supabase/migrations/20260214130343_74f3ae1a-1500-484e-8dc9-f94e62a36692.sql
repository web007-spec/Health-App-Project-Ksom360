
-- Fix: Allow creators to also see their conversations (needed for INSERT...RETURNING)
DROP POLICY IF EXISTS "Members can view their conversations" ON public.conversations;
CREATE POLICY "Members can view their conversations"
ON public.conversations FOR SELECT
TO authenticated
USING (is_conversation_member(auth.uid(), id) OR created_by = auth.uid());

-- Restore proper INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);
