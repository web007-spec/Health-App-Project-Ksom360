import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ClientSidebar } from "./ClientSidebar";
import { Bell, LogOut, RefreshCw } from "lucide-react";
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

  // Fetch effective client profile for avatar/name
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
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <ClientSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="font-semibold text-foreground">Welcome back!</h2>
                  <p className="text-sm text-muted-foreground">Let's crush today's workout</p>
                </div>
                {isImpersonating ? (
                  <Badge variant="default" className="bg-orange-500 hover:bg-orange-600">
                    Previewing: {profile?.full_name || profile?.email || "Client"}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="hidden sm:flex">
                    Client View
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-accent rounded-full" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar>
                      <AvatarImage src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${effectiveClientId}`} />
                      <AvatarFallback>{(profile?.full_name || profile?.email || "?").substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{profile?.full_name || profile?.email || user?.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {isImpersonating ? "Previewing Client" : "Client Account"}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleBackToTrainer} className="cursor-pointer">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {isImpersonating ? "Back to Trainer View" : "Switch to Trainer View"}
                  </DropdownMenuItem>
                  {!isImpersonating && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
