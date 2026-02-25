import { ClientBottomNav } from "./ClientBottomNav";
import { LogOut, RefreshCw, MessageCircle } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import logoSrc from "@/assets/logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const effectiveClientId = useEffectiveClientId();
  const isImpersonating = userRole === "trainer" && effectiveClientId !== user?.id;

  const { data: profile } = useQuery({
    queryKey: ["profile", effectiveClientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url, full_name, email")
        .eq("id", effectiveClientId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveClientId,
  });

  // Count unread messages across all conversations
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-messages-badge", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { data: memberships } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (!memberships?.length) return 0;
      const convoIds = memberships.map((m) => m.conversation_id);

      const { data: readReceipts } = await supabase
        .from("conversation_read_receipts")
        .select("conversation_id, last_read_at")
        .eq("user_id", user.id)
        .in("conversation_id", convoIds);

      const readMap = new Map(readReceipts?.map((r) => [r.conversation_id, r.last_read_at]) || []);

      const { data: messages } = await supabase
        .from("conversation_messages")
        .select("conversation_id, created_at, sender_id")
        .in("conversation_id", convoIds)
        .neq("sender_id", user.id)
        .order("created_at", { ascending: false });

      if (!messages?.length) return 0;

      let total = 0;
      for (const msg of messages) {
        const lastRead = readMap.get(msg.conversation_id);
        if (!lastRead || new Date(msg.created_at) > new Date(lastRead)) {
          total++;
        }
      }
      return total;
    },
    enabled: !!user?.id && userRole !== "trainer",
    refetchInterval: 30_000,
  });

  const isOnMessages = location.pathname === "/client/messages";

  const handleBackToTrainer = () => {
    localStorage.removeItem("impersonatedClientId");
    queryClient.clear();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
        {isImpersonating ? (
          <>
            <Badge variant="default" className="bg-orange-500 hover:bg-orange-600 text-xs">
              Previewing: {profile?.full_name || profile?.email || "Client"}
            </Badge>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={handleBackToTrainer}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Back
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Lion logo with message badge */}
            <button
              className="relative"
              onClick={() => navigate("/client/messages")}
              aria-label="Messages"
            >
              <img src={logoSrc} alt="KSOM360" className="h-8 w-8 object-contain" />
              {unreadCount > 0 && !isOnMessages && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center px-1 border border-card">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            <ThemeToggle />
          </>
        )}
      </header>

      {/* Main content with bottom padding for nav */}
      <main className="flex-1 overflow-auto pb-20">
        {children}
      </main>

      {/* Bottom tab bar */}
      <ClientBottomNav />
    </div>
  );
}

