import { DashboardLayout } from "@/components/DashboardLayout";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Search, Plus, Image, Paperclip, Users, ArrowLeft, X, Pin, SearchIcon, Mic, Square, Reply } from "lucide-react";
import { EmojiGifPicker } from "@/components/messaging/EmojiGifPicker";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { format, parseISO, isToday, isYesterday, isSameDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { cn } from "@/lib/utils";
import { MessageBubble } from "@/components/messaging/MessageBubble";
import { TypingIndicator } from "@/components/messaging/TypingIndicator";
import { PinnedMessages } from "@/components/messaging/PinnedMessages";
import { MessageSearch } from "@/components/messaging/MessageSearch";

interface ConversationDisplay {
  id: string;
  type: "direct" | "group";
  name: string;
  avatar_url: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  members: { id: string; full_name: string | null; avatar_url: string | null; email: string }[];
}

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<ConversationDisplay | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [searchResultIndex, setSearchResultIndex] = useState(0);
  const [showPinned, setShowPinned] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Determine if user is trainer
  const { data: userProfile } = useQuery({
    queryKey: ["user-profile-role", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user?.id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isTrainer = userProfile?.role === "trainer";

  // Fetch contacts
  const { data: contacts } = useQuery({
    queryKey: ["message-contacts", user?.id],
    queryFn: async () => {
      if (isTrainer) {
        const { data, error } = await supabase
          .from("trainer_clients")
          .select("client:profiles!trainer_clients_client_id_fkey(*)")
          .eq("trainer_id", user?.id!)
          .eq("status", "active");
        if (error) throw error;
        return (data || []).map((tc: any) => tc.client).filter(Boolean);
      } else {
        const { data, error } = await supabase
          .from("trainer_clients")
          .select("trainer:profiles!trainer_clients_trainer_id_fkey(*)")
          .eq("client_id", user?.id!);
        if (error) throw error;
        return (data || []).map((tc: any) => tc.trainer).filter(Boolean);
      }
    },
    enabled: !!user?.id && userProfile !== undefined,
  });

  // Fetch conversations
  const { data: conversations, refetch: refetchConversations } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async (): Promise<ConversationDisplay[]> => {
      if (!user?.id) return [];

      const { data: memberships, error: memErr } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user.id);
      if (memErr) throw memErr;
      if (!memberships?.length) return [];

      const convoIds = memberships.map((m) => m.conversation_id);

      const { data: convos, error: convoErr } = await supabase
        .from("conversations")
        .select("*")
        .in("id", convoIds);
      if (convoErr) throw convoErr;

      // Get all members
      const { data: rawMembers, error: allMemErr } = await supabase
        .from("conversation_members")
        .select("conversation_id, user_id")
        .in("conversation_id", convoIds);
      if (allMemErr) throw allMemErr;

      const memberUserIds = [...new Set((rawMembers || []).map((m) => m.user_id))];
      const { data: memberProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email")
        .in("id", memberUserIds);
      const profileMap = new Map((memberProfiles || []).map((p) => [p.id, p]));

      const allMembers = (rawMembers || []).map((m) => ({
        conversation_id: m.conversation_id,
        user_id: m.user_id,
        profile: profileMap.get(m.user_id) || null,
      }));

      // Get last messages
      const { data: lastMessages, error: msgErr } = await supabase
        .from("conversation_messages")
        .select("conversation_id, content, image_url, file_name, created_at")
        .in("conversation_id", convoIds)
        .order("created_at", { ascending: false });
      if (msgErr) throw msgErr;

      // Get read receipts
      const { data: readReceipts } = await supabase
        .from("conversation_read_receipts")
        .select("conversation_id, last_read_at")
        .eq("user_id", user.id)
        .in("conversation_id", convoIds);

      const readMap = new Map(readReceipts?.map((r) => [r.conversation_id, r.last_read_at]) || []);

      const lastMsgMap = new Map<string, any>();
      lastMessages?.forEach((m) => {
        if (!lastMsgMap.has(m.conversation_id)) lastMsgMap.set(m.conversation_id, m);
      });

      const result: ConversationDisplay[] = (convos || []).map((c) => {
        const members = (allMembers || [])
          .filter((m) => m.conversation_id === c.id)
          .map((m: any) => m.profile)
          .filter(Boolean);
        const otherMembers = members.filter((m: any) => m.id !== user.id);
        const lastMsg = lastMsgMap.get(c.id);
        const lastRead = readMap.get(c.id);

        let lastMessageText = null;
        if (lastMsg) {
          if (lastMsg.content) lastMessageText = lastMsg.content;
          else if (lastMsg.image_url) lastMessageText = "📷 Photo";
          else if (lastMsg.file_name) lastMessageText = `📎 ${lastMsg.file_name}`;
        }

        let unreadCount = 0;
        if (lastMsg && lastRead) {
          unreadCount = (lastMessages || []).filter(
            (m) => m.conversation_id === c.id && new Date(m.created_at) > new Date(lastRead)
          ).length;
        } else if (lastMsg && !lastRead) {
          unreadCount = (lastMessages || []).filter((m) => m.conversation_id === c.id).length;
        }

        return {
          id: c.id,
          type: c.type as "direct" | "group",
          name: c.type === "group" ? (c.name || "Group") : (otherMembers[0]?.full_name || otherMembers[0]?.email || "User"),
          avatar_url: c.type === "group" ? c.avatar_url : otherMembers[0]?.avatar_url,
          lastMessage: lastMessageText,
          lastMessageAt: lastMsg?.created_at || c.created_at,
          unreadCount,
          members,
        };
      });

      result.sort((a, b) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTime - aTime;
      });

      return result;
    },
    enabled: !!user?.id,
    refetchInterval: 10000,
  });

  // Fetch messages for selected conversation
  const { data: messages } = useQuery({
    queryKey: ["conversation-messages", selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation) return [];
      const { data, error } = await supabase
        .from("conversation_messages")
        .select("*")
        .eq("conversation_id", selectedConversation.id)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Fetch sender profiles separately
      const senderIds = [...new Set((data || []).map((m) => m.sender_id))];
      const { data: senderProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", senderIds);
      const senderMap = new Map((senderProfiles || []).map((p) => [p.id, p]));

      // Fetch replied-to messages
      const replyIds = (data || []).map((m) => m.reply_to_id).filter(Boolean);
      let replyMap = new Map();
      if (replyIds.length) {
        const { data: replyMsgs } = await supabase
          .from("conversation_messages")
          .select("*")
          .in("id", replyIds);
        replyMsgs?.forEach((m) => {
          replyMap.set(m.id, { ...m, sender: senderMap.get(m.sender_id) || null });
        });
      }

      const messagesWithSender = (data || []).map((m) => ({
        ...m,
        sender: senderMap.get(m.sender_id) || null,
        replyToMessage: m.reply_to_id ? replyMap.get(m.reply_to_id) : null,
      }));

      // Update read receipt
      await supabase.from("conversation_read_receipts").upsert(
        { conversation_id: selectedConversation.id, user_id: user!.id, last_read_at: new Date().toISOString() },
        { onConflict: "conversation_id,user_id" }
      );

      return messagesWithSender;
    },
    enabled: !!selectedConversation?.id && !!user?.id,
    refetchInterval: 3000,
  });

  // Fetch reactions for current conversation messages
  const messageIds = useMemo(() => messages?.map((m: any) => m.id) || [], [messages]);
  const { data: allReactions } = useQuery({
    queryKey: ["message-reactions", selectedConversation?.id, messageIds],
    queryFn: async () => {
      if (!messageIds.length) return [];
      const { data, error } = await supabase
        .from("message_reactions")
        .select("*")
        .in("message_id", messageIds);
      if (error) throw error;
      return data || [];
    },
    enabled: messageIds.length > 0,
    refetchInterval: 5000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!selectedConversation?.id) return;
    const channel = supabase
      .channel(`conversation-${selectedConversation.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "conversation_messages",
        filter: `conversation_id=eq.${selectedConversation.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedConversation.id] });
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "message_reactions",
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["message-reactions", selectedConversation.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConversation?.id, queryClient]);

  // Typing indicator via Realtime presence
  useEffect(() => {
    if (!selectedConversation?.id || !user?.id) return;

    const { data: profile } = queryClient.getQueryData(["user-profile-role", user.id]) as any || {};
    const channel = supabase.channel(`typing-${selectedConversation.id}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const typing = Object.entries(state)
          .filter(([key]) => key !== user.id)
          .filter(([_, vals]: any) => vals[0]?.isTyping)
          .map(([_, vals]: any) => vals[0]?.name || "Someone");
        setTypingUsers(typing);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedConversation?.id, user?.id]);

  // Broadcast typing state
  const broadcastTyping = useCallback(() => {
    if (!selectedConversation?.id || !user?.id) return;
    const channel = supabase.channel(`typing-${selectedConversation.id}`);
    
    const userProfile = queryClient.getQueryData(["user-profile-role", user.id]);
    channel.track({
      isTyping: true,
      name: user.email?.split("@")[0] || "User",
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      channel.track({ isTyping: false, name: "" });
    }, 2000);
  }, [selectedConversation?.id, user?.id, user?.email]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message
  const sendMutation = useMutation({
    mutationFn: async (payload: { content?: string; image_url?: string; file_url?: string; file_name?: string }) => {
      if (!selectedConversation || !user?.id) throw new Error("No conversation selected");
      const { error } = await supabase.from("conversation_messages").insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        reply_to_id: replyTo?.id || null,
        ...payload,
      });
      if (error) throw error;

      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", selectedConversation.id).then(() => {});
    },
    onSuccess: () => {
      setMessageText("");
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  // React to message
  const reactMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const { error } = await supabase.from("message_reactions").insert({
        message_id: messageId,
        user_id: user!.id,
        emoji,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-reactions"] });
    },
  });

  const removeReactionMutation = useMutation({
    mutationFn: async (reactionId: string) => {
      const { error } = await supabase.from("message_reactions").delete().eq("id", reactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-reactions"] });
    },
  });

  // Pin/unpin message
  const pinMutation = useMutation({
    mutationFn: async ({ messageId, pinned }: { messageId: string; pinned: boolean }) => {
      const { error } = await supabase
        .from("conversation_messages")
        .update({ is_pinned: pinned })
        .eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation-messages"] });
    },
  });

  // Create or get direct conversation
  const getOrCreateDirectConversation = useCallback(async (contactId: string) => {
    if (!user?.id) throw new Error("Not authenticated");

    const { data: myMemberships } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (myMemberships?.length) {
      const myConvoIds = myMemberships.map((m) => m.conversation_id);
      const { data: theirMemberships } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", contactId)
        .in("conversation_id", myConvoIds);

      if (theirMemberships?.length) {
        const sharedConvoIds = theirMemberships.map((m) => m.conversation_id);
        const { data: directConvos } = await supabase
          .from("conversations")
          .select("id")
          .in("id", sharedConvoIds)
          .eq("type", "direct");

        if (directConvos?.length) return directConvos[0].id;
      }
    }

    const { data: newConvo, error: convoErr } = await supabase
      .from("conversations")
      .insert({ type: "direct", created_by: user.id })
      .select()
      .single();
    if (convoErr) throw convoErr;

    const { error: memberErr } = await supabase.from("conversation_members").insert([
      { conversation_id: newConvo.id, user_id: user.id },
      { conversation_id: newConvo.id, user_id: contactId },
    ]);
    if (memberErr) console.error("Member insert error:", memberErr);

    return newConvo.id;
  }, [user?.id]);

  const startDirectChat = async (contact: any) => {
    try {
      const convoId = await getOrCreateDirectConversation(contact.id);
      await refetchConversations();
      const updatedConvos = queryClient.getQueryData<ConversationDisplay[]>(["conversations", user?.id]);
      const convo = updatedConvos?.find((c) => c.id === convoId);
      if (convo) {
        setSelectedConversation(convo);
        setShowMobileChat(true);
      } else {
        setSelectedConversation({
          id: convoId!,
          type: "direct",
          name: contact.full_name || contact.email,
          avatar_url: contact.avatar_url,
          lastMessage: null,
          lastMessageAt: null,
          unreadCount: 0,
          members: [contact],
        });
        setShowMobileChat(true);
      }
    } catch (err) {
      console.error("startDirectChat error:", err);
      toast({ title: "Error", description: "Failed to start conversation", variant: "destructive" });
    }
  };

  // Create group conversation
  const createGroupMutation = useMutation({
    mutationFn: async ({ name, memberIds }: { name: string; memberIds: string[] }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data: newConvo, error } = await supabase
        .from("conversations")
        .insert({ type: "group", name, created_by: user.id })
        .select()
        .single();
      if (error) throw error;

      const allMembers = [user.id, ...memberIds].map((uid) => ({
        conversation_id: newConvo.id,
        user_id: uid,
      }));
      await supabase.from("conversation_members").insert(allMembers);
      return newConvo;
    },
    onSuccess: () => {
      setShowGroupDialog(false);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast({ title: "Group created!" });
    },
    onError: () => {
      toast({ title: "Failed to create group", variant: "destructive" });
    },
  });

  // File/image upload
  const handleFileUpload = async (file: File, type: "image" | "file") => {
    if (!user?.id || !selectedConversation) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("chat-attachments")
      .upload(path, file);
    if (uploadErr) {
      toast({ title: "Upload failed", variant: "destructive" });
      return;
    }
    const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
    if (type === "image") {
      sendMutation.mutate({ image_url: urlData.publicUrl });
    } else {
      sendMutation.mutate({ file_url: urlData.publicUrl, file_name: file.name });
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        await handleFileUpload(file, "file");
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    sendMutation.mutate({ content: messageText.trim() });
  };

  const filteredConversations = conversations?.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const contactsWithoutConvo = contacts?.filter((contact: any) => {
    return !conversations?.some(
      (c) => c.type === "direct" && c.members.some((m) => m.id === contact.id)
    );
  });

  // Message search results
  const searchResults = useMemo(() => {
    if (!messageSearchQuery.trim() || !messages) return [];
    return messages.filter((m: any) =>
      m.content?.toLowerCase().includes(messageSearchQuery.toLowerCase())
    );
  }, [messageSearchQuery, messages]);

  // Pinned messages
  const pinnedMessages = useMemo(() => {
    return messages?.filter((m: any) => m.is_pinned) || [];
  }, [messages]);

  const formatMessageDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return format(date, "p");
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d");
  };

  const formatDateSeparator = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "EEEE, MMMM d, yyyy");
  };

  const jumpToMessage = (messageId: string) => {
    const el = messageRefs.current.get(messageId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("bg-primary/10");
      setTimeout(() => el.classList.remove("bg-primary/10"), 2000);
    }
  };

  const Layout = isTrainer ? DashboardLayout : ClientLayout;

  // Group messages by date
  const messagesByDate = useMemo(() => {
    if (!messages) return [];
    const groups: { date: string; messages: any[] }[] = [];
    let currentDate = "";
    messages.forEach((msg: any) => {
      const msgDate = format(parseISO(msg.created_at), "yyyy-MM-dd");
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msg.created_at, messages: [] });
      }
      groups[groups.length - 1].messages.push(msg);
    });
    return groups;
  }, [messages]);

  // Conversation list sidebar
  const conversationList = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Messages</h2>
          {isTrainer && (
            <Button variant="outline" size="sm" onClick={() => setShowGroupDialog(true)}>
              <Users className="h-4 w-4 mr-1" />
              New Group
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredConversations && filteredConversations.length > 0 ? (
            filteredConversations.map((convo) => (
              <button
                key={convo.id}
                onClick={() => { setSelectedConversation(convo); setShowMobileChat(true); }}
                className={cn(
                  "w-full p-3 rounded-lg flex items-center gap-3 hover:bg-muted transition-colors",
                  selectedConversation?.id === convo.id && "bg-muted"
                )}
              >
                <div className="relative">
                  <Avatar>
                    {convo.type === "group" ? (
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Users className="h-4 w-4" />
                      </AvatarFallback>
                    ) : (
                      <>
                        <AvatarImage src={convo.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {convo.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  {convo.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                      {convo.unreadCount > 9 ? "9+" : convo.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={cn("font-medium text-sm truncate", convo.unreadCount > 0 && "font-bold")}>{convo.name}</p>
                    {convo.lastMessageAt && (
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {formatMessageDate(convo.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {convo.type === "group" && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 shrink-0">
                        {convo.members.length}
                      </Badge>
                    )}
                    <p className={cn("text-xs truncate", convo.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>
                      {convo.lastMessage || "No messages yet"}
                    </p>
                  </div>
                </div>
              </button>
            ))
          ) : null}

          {contactsWithoutConvo && contactsWithoutConvo.length > 0 && (
            <>
              <div className="px-3 pt-4 pb-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Start a conversation</p>
              </div>
              {contactsWithoutConvo.map((contact: any) => (
                <button
                  key={contact.id}
                  onClick={() => startDirectChat(contact)}
                  className="w-full p-3 rounded-lg flex items-center gap-3 hover:bg-muted transition-colors"
                >
                  <Avatar>
                    <AvatarImage src={contact.avatar_url || undefined} />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      {contact.full_name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">{contact.full_name || "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </>
          )}

          {!filteredConversations?.length && !contactsWithoutConvo?.length && (
            <p className="text-center text-muted-foreground p-4 text-sm">No conversations yet</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  // Chat area
  const chatArea = selectedConversation ? (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={() => setShowMobileChat(false)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar>
          {selectedConversation.type === "group" ? (
            <AvatarFallback className="bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </AvatarFallback>
          ) : (
            <>
              <AvatarImage src={selectedConversation.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {selectedConversation.name?.charAt(0) || "U"}
              </AvatarFallback>
            </>
          )}
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{selectedConversation.name}</p>
          {selectedConversation.type === "group" && (
            <p className="text-xs text-muted-foreground truncate">
              {selectedConversation.members.map((m) => m.full_name || m.email).join(", ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowMessageSearch(!showMessageSearch)}
          >
            <SearchIcon className="h-4 w-4" />
          </Button>
          {pinnedMessages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowPinned(!showPinned)}
            >
              <Pin className="h-4 w-4" />
              <span className="sr-only">{pinnedMessages.length} pinned</span>
            </Button>
          )}
        </div>
      </div>

      {/* Message Search */}
      {showMessageSearch && (
        <MessageSearch
          onSearch={(q) => { setMessageSearchQuery(q); setSearchResultIndex(0); }}
          onClose={() => { setShowMessageSearch(false); setMessageSearchQuery(""); }}
          resultCount={searchResults.length}
          currentIndex={searchResultIndex}
          onNext={() => {
            const next = Math.min(searchResultIndex + 1, searchResults.length - 1);
            setSearchResultIndex(next);
            jumpToMessage(searchResults[next]?.id);
          }}
          onPrev={() => {
            const prev = Math.max(searchResultIndex - 1, 0);
            setSearchResultIndex(prev);
            jumpToMessage(searchResults[prev]?.id);
          }}
        />
      )}

      {/* Pinned Messages */}
      {showPinned && pinnedMessages.length > 0 && (
        <PinnedMessages
          messages={pinnedMessages}
          onClose={() => setShowPinned(false)}
          onJumpToMessage={jumpToMessage}
        />
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-1">
          {messagesByDate.length > 0 ? (
            messagesByDate.map((group) => (
              <div key={group.date}>
                {/* Date separator */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground font-medium px-2">
                    {formatDateSeparator(group.date)}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div className="space-y-3">
                  {group.messages.map((message: any, idx: number) => {
                    const isOwn = message.sender_id === user?.id;
                    const msgReactions = allReactions?.filter((r: any) => r.message_id === message.id) || [];
                    const isHighlighted = searchResults.some((r: any) => r.id === message.id);

                    return (
                      <div
                        key={message.id}
                        ref={(el) => { if (el) messageRefs.current.set(message.id, el); }}
                        className={cn("transition-colors duration-500 rounded-lg", isHighlighted && messageSearchQuery && "bg-accent/50")}
                      >
                        <MessageBubble
                          message={message}
                          isOwn={isOwn}
                          isGroup={selectedConversation.type === "group"}
                          showSenderName={true}
                          reactions={msgReactions}
                          onReact={(emoji) => reactMutation.mutate({ messageId: message.id, emoji })}
                          onRemoveReaction={(id) => removeReactionMutation.mutate(id)}
                          onReply={() => setReplyTo(message)}
                          onPin={() => pinMutation.mutate({ messageId: message.id, pinned: !message.is_pinned })}
                          replyToMessage={message.replyToMessage}
                          userId={user?.id}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Typing indicator */}
      <TypingIndicator names={typingUsers} />

      {/* Reply preview */}
      {replyTo && (
        <div className="px-4 py-2 border-t bg-muted/50 flex items-center gap-2">
          <Reply className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary">{replyTo.sender?.full_name || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{replyTo.content || "📎 Attachment"}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setReplyTo(null)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-3 border-t">
        <div className="flex items-center gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, "image");
              e.target.value = "";
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, "file");
              e.target.value = "";
            }}
          />
          <EmojiGifPicker
            onSelectEmoji={(emoji) => setMessageText((prev) => prev + emoji)}
            onSelectGif={(gifUrl) => sendMutation.mutate({ image_url: gifUrl })}
          />
          <Button type="button" variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => imageInputRef.current?.click()}>
            <Image className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              broadcastTyping();
            }}
            className="flex-1"
          />
          {messageText.trim() ? (
            <Button type="submit" size="icon" disabled={sendMutation.isPending} className="shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              variant={isRecording ? "destructive" : "ghost"}
              className="shrink-0"
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </form>
    </div>
  ) : (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-lg font-medium">Select a conversation</p>
        <p className="text-sm">Choose a contact or group to start messaging</p>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        <div className={cn(
          "w-full md:w-80 border-r flex-shrink-0",
          showMobileChat ? "hidden md:flex md:flex-col" : "flex flex-col"
        )}>
          {conversationList}
        </div>

        <div className={cn(
          "flex-1 flex flex-col",
          showMobileChat ? "flex" : "hidden md:flex"
        )}>
          {chatArea}
        </div>
      </div>

      {isTrainer && contacts && (
        <CreateGroupDialog
          open={showGroupDialog}
          onOpenChange={setShowGroupDialog}
          contacts={contacts}
          onCreateGroup={(name, memberIds) => createGroupMutation.mutate({ name, memberIds })}
          isLoading={createGroupMutation.isPending}
        />
      )}
    </Layout>
  );
}
