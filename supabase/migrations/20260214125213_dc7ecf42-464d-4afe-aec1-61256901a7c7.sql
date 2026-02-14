-- Allow conversation members to update the conversation (for timestamp updates)
DROP POLICY IF EXISTS "Creator can update conversation" ON public.conversations;

CREATE POLICY "Members can update conversation"
ON public.conversations
FOR UPDATE
USING (is_conversation_member(auth.uid(), id));