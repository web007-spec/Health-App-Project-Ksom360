
-- Conversations table (supports both direct and group)
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  name TEXT, -- null for direct, set for group
  avatar_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Conversation members
CREATE TABLE public.conversation_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Conversation messages (replaces old messages for new UI)
CREATE TABLE public.conversation_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT,
  image_url TEXT,
  file_url TEXT,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Read receipts per member
CREATE TABLE public.conversation_read_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_read_receipts ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is member of conversation
CREATE OR REPLACE FUNCTION public.is_conversation_member(_user_id UUID, _conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_members
    WHERE user_id = _user_id AND conversation_id = _conversation_id
  )
$$;

-- Conversations: members can view
CREATE POLICY "Members can view their conversations"
ON public.conversations FOR SELECT
USING (public.is_conversation_member(auth.uid(), id));

-- Conversations: trainers can create
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Conversations: creator can update
CREATE POLICY "Creator can update conversation"
ON public.conversations FOR UPDATE
USING (auth.uid() = created_by);

-- Conversation members: members can view other members
CREATE POLICY "Members can view conversation members"
ON public.conversation_members FOR SELECT
USING (public.is_conversation_member(auth.uid(), conversation_id));

-- Conversation members: creator/trainer can manage
CREATE POLICY "Conversation creator can manage members"
ON public.conversation_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id AND c.created_by = auth.uid()
  )
);

CREATE POLICY "Conversation creator can remove members"
ON public.conversation_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id AND c.created_by = auth.uid()
  )
  OR user_id = auth.uid() -- members can leave
);

-- Messages: members can view
CREATE POLICY "Members can view conversation messages"
ON public.conversation_messages FOR SELECT
USING (public.is_conversation_member(auth.uid(), conversation_id));

-- Messages: members can send
CREATE POLICY "Members can send messages"
ON public.conversation_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_conversation_member(auth.uid(), conversation_id)
);

-- Read receipts: own
CREATE POLICY "Users can manage their read receipts"
ON public.conversation_read_receipts FOR ALL
USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_messages;

-- Update timestamp trigger
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true);

CREATE POLICY "Members can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view chat attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');
