import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch contacts (trainer sees clients, client sees trainer)
  const { data: contacts } = useQuery({
    queryKey: ["message-contacts", user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user?.id)
        .single();

      if (profile?.role === "trainer") {
        // Fetch trainer's clients
        const { data, error } = await supabase
          .from("trainer_clients")
          .select(`
            client_id,
            client:profiles!trainer_clients_client_id_fkey(*)
          `)
          .eq("trainer_id", user?.id)
          .eq("status", "active");

        if (error) throw error;
        return data.map((tc) => tc.client);
      } else {
        // Fetch client's trainer
        const { data, error } = await supabase
          .from("trainer_clients")
          .select(`
            trainer_id,
            trainer:profiles!trainer_clients_trainer_id_fkey(*)
          `)
          .eq("client_id", user?.id);

        if (error) throw error;
        return data.map((tc) => tc.trainer);
      }
    },
    enabled: !!user?.id,
  });

  // Fetch messages with selected contact
  const { data: messages } = useQuery({
    queryKey: ["messages", user?.id, selectedContact?.id],
    queryFn: async () => {
      if (!selectedContact) return [];

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user?.id},recipient_id.eq.${selectedContact.id}),and(sender_id.eq.${selectedContact.id},recipient_id.eq.${user?.id})`)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Mark messages as read
      const unreadIds = data
        .filter((m) => m.recipient_id === user?.id && !m.read_at)
        .map((m) => m.id);

      if (unreadIds.length > 0) {
        await supabase
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .in("id", unreadIds);
      }

      return data;
    },
    enabled: !!user?.id && !!selectedContact,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!messageText.trim() || !selectedContact) return;

      const { error } = await supabase.from("messages").insert({
        sender_id: user?.id,
        recipient_id: selectedContact.id,
        content: messageText.trim(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const filteredContacts = contacts?.filter((contact) =>
    contact?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessageMutation.mutate();
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Contacts Sidebar */}
        <div className="w-80 border-r flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-xl font-bold mb-3">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2">
              {filteredContacts && filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`w-full p-3 rounded-lg flex items-center gap-3 hover:bg-muted transition-colors ${
                      selectedContact?.id === contact.id ? "bg-muted" : ""
                    }`}
                  >
                    <Avatar>
                      <AvatarImage src={contact.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {contact.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium truncate">{contact.full_name || "User"}</p>
                      <p className="text-sm text-muted-foreground truncate">{contact.email}</p>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-center text-muted-foreground p-4">No contacts found</p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Message Area */}
        <div className="flex-1 flex flex-col">
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={selectedContact.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedContact.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedContact.full_name || "User"}</p>
                  <p className="text-sm text-muted-foreground">{selectedContact.email}</p>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages && messages.length > 0 ? (
                    messages.map((message) => {
                      const isOwn = message.sender_id === user?.id;
                      return (
                        <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[70%] ${isOwn ? "order-2" : "order-1"}`}>
                            <div
                              className={`rounded-lg p-3 ${
                                isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 px-1">
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
              <form onSubmit={handleSendMessage} className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!messageText.trim() || sendMessageMutation.isPending}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p className="text-lg font-medium">Select a contact to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
