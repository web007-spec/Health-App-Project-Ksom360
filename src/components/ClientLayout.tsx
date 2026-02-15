import { ClientBottomNav } from "./ClientBottomNav";
import { LogOut, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
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

  const handleBackToTrainer = () => {
    localStorage.removeItem("impersonatedClientId");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar - only show when impersonating */}
      {isImpersonating && (
        <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
          <Badge variant="default" className="bg-orange-500 hover:bg-orange-600 text-xs">
            Previewing: {profile?.full_name || profile?.email || "Client"}
          </Badge>
          <Button variant="ghost" size="sm" onClick={handleBackToTrainer}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Back
          </Button>
        </header>
      )}

      {/* Main content with bottom padding for nav */}
      <main className="flex-1 overflow-auto pb-20">
        {children}
      </main>

      {/* Bottom tab bar */}
      <ClientBottomNav />
    </div>
  );
}
