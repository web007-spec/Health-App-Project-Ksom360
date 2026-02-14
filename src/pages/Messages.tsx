import { DashboardLayout } from "@/components/DashboardLayout";
import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Search, Plus, Image, Paperclip, Users, ArrowLeft, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useRef, useCallback } from "react";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { cn } from "@/lib/utils";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch contacts for creating new conversations
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

      // Get all conversations this user is a member of
      const { data: memberships, error: memErr } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user.id);
      if (memErr) throw memErr;
      if (!memberships?.length) return [];

      const convoIds = memberships.map((m) => m.conversation_id);

      // Get conversation details
      const { data: convos, error: convoErr } = await supabase
        .from("conversations")
        .select("*")
        .in("id", convoIds);
      if (convoErr) throw convoErr;

      // Get all members for these conversations
      const { data: allMembers, error: allMemErr } = await supabase
        .from("conversation_members")
        .select("conversation_id, user_id, profile:user_id(id, full_name, avatar_url, email)")
        .in("conversation_id", convoIds);
      if (allMemErr) throw allMemErr;

      // Get last message per conversation
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

      // Get unread counts
      const readMap = new Map(readReceipts?.map((r) => [r.conversation_id, r.last_read_at]) || []);

      // Build last message map (first per conversation_id since ordered desc)
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

        // Count unread messages
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

      // Sort by last message time
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
        .select("*, sender:sender_id(id, full_name, avatar_url)")
        .eq("conversation_id", selectedConversation.id)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Update read receipt
      await supabase.from("conversation_read_receipts").upsert(
        { conversation_id: selectedConversation.id, user_id: user!.id, last_read_at: new Date().toISOString() },
        { onConflict: "conversation_id,user_id" }
      );

      return data;
    },
    enabled: !!selectedConversation?.id && !!user?.id,
    refetchInterval: 3000,
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
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConversation?.id, queryClient]);

  // Auto-scroll to bottom
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
        ...payload,
      });
      if (error) throw error;

      // Update conversation timestamp (ignore errors for non-creators)
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", selectedConversation.id).then(() => {});
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  // Create or get direct conversation
  const getOrCreateDirectConversation = useCallback(async (contactId: string) => {
    if (!user?.id) throw new Error("Not authenticated");

    // Check if direct conversation already exists
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
        // Check which ones are direct
        const sharedConvoIds = theirMemberships.map((m) => m.conversation_id);
        const { data: directConvos } = await supabase
          .from("conversations")
          .select("id")
          .in("id", sharedConvoIds)
          .eq("type", "direct");

        if (directConvos?.length) return directConvos[0].id;
      }
    }

    // Create new direct conversation
    const { data: newConvo, error: convoErr } = await supabase
      .from("conversations")
      .insert({ type: "direct", created_by: user.id })
      .select()
      .single();
    if (convoErr) throw convoErr;

    // Add both members
    await supabase.from("conversation_members").insert([
      { conversation_id: newConvo.id, user_id: user.id },
      { conversation_id: newConvo.id, user_id: contactId },
    ]);

    return newConvo.id;
  }, [user?.id]);

  // Start a direct chat with a contact
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
        // fallback
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
    } catch {
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

      // Add trainer + selected members
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    sendMutation.mutate({ content: messageText.trim() });
  };

  const filteredConversations = conversations?.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Contacts not yet in a direct conversation
  const contactsWithoutConvo = contacts?.filter((contact: any) => {
    return !conversations?.some(
      (c) => c.type === "direct" && c.members.some((m) => m.id === contact.id)
    );
  });

  const formatMessageDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return format(date, "p");
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d");
  };

  const Layout = isTrainer ? DashboardLayout : ClientLayout;

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
          {/* Existing conversations */}
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
                    <p className="font-medium text-sm truncate">{convo.name}</p>
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
                    <p className="text-xs text-muted-foreground truncate">
                      {convo.lastMessage || "No messages yet"}
                    </p>
                  </div>
                </div>
              </button>
            ))
          ) : null}

          {/* Contacts without conversations */}
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
        <div className="min-w-0">
          <p className="font-semibold truncate">{selectedConversation.name}</p>
          {selectedConversation.type === "group" && (
            <p className="text-xs text-muted-foreground truncate">
              {selectedConversation.members.map((m) => m.full_name || m.email).join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {messages && messages.length > 0 ? (
            messages.map((message: any) => {
              const isOwn = message.sender_id === user?.id;
              const sender = message.sender;
              return (
                <div key={message.id} className={cn("flex gap-2", isOwn ? "justify-end" : "justify-start")}>
                  {!isOwn && selectedConversation.type === "group" && (
                    <Avatar className="h-7 w-7 mt-1 shrink-0">
                      <AvatarImage src={sender?.avatar_url} />
                      <AvatarFallback className="text-[10px] bg-muted">
                        {sender?.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn("max-w-[75%]")}>
                    {!isOwn && selectedConversation.type === "group" && (
                      <p className="text-xs text-muted-foreground mb-0.5 px-1">
                        {sender?.full_name || "User"}
                      </p>
                    )}
                    <div className={cn(
                      "rounded-2xl p-3",
                      isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"
                    )}>
                      {message.image_url && (
                        <img
                          src={message.image_url}
                          alt="Shared image"
                          className="rounded-lg max-w-full max-h-60 object-cover mb-1 cursor-pointer"
                          onClick={() => window.open(message.image_url, "_blank")}
                        />
                      )}
                      {message.file_url && (
                        <a
                          href={message.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "flex items-center gap-2 text-sm underline",
                            isOwn ? "text-primary-foreground" : "text-foreground"
                          )}
                        >
                          <Paperclip className="h-3.5 w-3.5 shrink-0" />
                          {message.file_name || "Download file"}
                        </a>
                      )}
                      {message.content && <p className="text-sm">{message.content}</p>}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 px-1">
                      {format(parseISO(message.created_at), "p")}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          )}
        </div>
      </ScrollArea>

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
          <Button type="button" variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => imageInputRef.current?.click()}>
            <Image className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!messageText.trim() || sendMutation.isPending} className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
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
        {/* Sidebar - hidden on mobile when chat is open */}
        <div className={cn(
          "w-full md:w-80 border-r flex-shrink-0",
          showMobileChat ? "hidden md:flex md:flex-col" : "flex flex-col"
        )}>
          {conversationList}
        </div>

        {/* Chat area - hidden on mobile when sidebar is shown */}
        <div className={cn(
          "flex-1 flex flex-col",
          showMobileChat ? "flex" : "hidden md:flex"
        )}>
          {chatArea}
        </div>
      </div>

      {/* Group Dialog */}
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
