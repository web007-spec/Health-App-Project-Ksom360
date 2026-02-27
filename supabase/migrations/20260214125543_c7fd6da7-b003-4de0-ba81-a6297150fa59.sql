
-- Fix: Change conversations INSERT policy to PERMISSIVE
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Fix: Change conversations SELECT policy to PERMISSIVE
DROP POLICY IF EXISTS "Members can view their conversations" ON public.conversations;
CREATE POLICY "Members can view their conversations"
ON public.conversations FOR SELECT
USING (is_conversation_member(auth.uid(), id));

-- Fix: Change conversations UPDATE policy to PERMISSIVE
DROP POLICY IF EXISTS "Members can update conversation" ON public.conversations;
CREATE POLICY "Members can update conversation"
ON public.conversations FOR UPDATE
USING (is_conversation_member(auth.uid(), id));

-- Fix: Change conversation_members INSERT policy to PERMISSIVE
DROP POLICY IF EXISTS "Conversation creator can manage members" ON public.conversation_members;
CREATE POLICY "Conversation creator can manage members"
ON public.conversation_members FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM conversations c
  WHERE c.id = conversation_members.conversation_id AND c.created_by = auth.uid()
));

-- Fix: Change conversation_members SELECT policy to PERMISSIVE
DROP POLICY IF EXISTS "Members can view conversation members" ON public.conversation_members;
CREATE POLICY "Members can view conversation members"
ON public.conversation_members FOR SELECT
USING (is_conversation_member(auth.uid(), conversation_id));

-- Fix: Change conversation_members DELETE policy to PERMISSIVE
DROP POLICY IF EXISTS "Conversation creator can remove members" ON public.conversation_members;
CREATE POLICY "Conversation creator can remove members"
ON public.conversation_members FOR DELETE
USING (
  (EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_members.conversation_id AND c.created_by = auth.uid()))
  OR (user_id = auth.uid())
);

-- Fix: Change conversation_messages policies to PERMISSIVE
DROP POLICY IF EXISTS "Members can send messages" ON public.conversation_messages;
CREATE POLICY "Members can send messages"
ON public.conversation_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id AND is_conversation_member(auth.uid(), conversation_id));

DROP POLICY IF EXISTS "Members can view conversation messages" ON public.conversation_messages;
CREATE POLICY "Members can view conversation messages"
ON public.conversation_messages FOR SELECT
USING (is_conversation_member(auth.uid(), conversation_id));

-- Fix: Change conversation_read_receipts policy to PERMISSIVE
DROP POLICY IF EXISTS "Users can manage their read receipts" ON public.conversation_read_receipts;
CREATE POLICY "Users can manage their read receipts"
ON public.conversation_read_receipts FOR ALL
USING (auth.uid() = user_id);
