
-- Add reply_to_id and is_pinned to conversation_messages
ALTER TABLE public.conversation_messages 
ADD COLUMN reply_to_id uuid REFERENCES public.conversation_messages(id) ON DELETE SET NULL,
ADD COLUMN is_pinned boolean NOT NULL DEFAULT false;

-- Create message_reactions table
CREATE TABLE public.message_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.conversation_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Reactions policies: members of the conversation can view/add/remove reactions
CREATE POLICY "Members can view reactions"
ON public.message_reactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_messages cm
    WHERE cm.id = message_reactions.message_id
    AND is_conversation_member(auth.uid(), cm.conversation_id)
  )
);

CREATE POLICY "Members can add reactions"
ON public.message_reactions FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM conversation_messages cm
    WHERE cm.id = message_reactions.message_id
    AND is_conversation_member(auth.uid(), cm.conversation_id)
  )
);

CREATE POLICY "Users can remove their reactions"
ON public.message_reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow conversation members to update is_pinned
DROP POLICY IF EXISTS "Members can send messages" ON public.conversation_messages;
CREATE POLICY "Members can send messages"
ON public.conversation_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id 
  AND is_conversation_member(auth.uid(), conversation_id)
);

-- Allow members to update pinned status
CREATE POLICY "Members can pin messages"
ON public.conversation_messages FOR UPDATE
TO authenticated
USING (is_conversation_member(auth.uid(), conversation_id));

-- Enable realtime for conversation_messages and message_reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
