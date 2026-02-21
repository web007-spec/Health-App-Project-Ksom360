import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Settings, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function ClientProfile() {
  const navigate = useNavigate();
  const { signOut, userRole } = useAuth();
  const clientId = useEffectiveClientId();
  const isImpersonating = userRole === "trainer";

  const { data: profile } = useQuery({
    queryKey: ["profile", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", clientId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: savedPlan } = useQuery({
    queryKey: ["saved-fasting-plan", clientId],
    queryFn: async () => {
      const { data: settings } = await supabase
        .from("client_feature_settings")
        .select("selected_quick_plan_id, selected_protocol_id")
        .eq("client_id", clientId)
        .maybeSingle();
      if (!settings?.selected_quick_plan_id && !settings?.selected_protocol_id) return null;
      if (settings.selected_quick_plan_id) {
        const { data } = await supabase
          .from("quick_fasting_plans")
          .select("name, fast_hours, eat_hours")
          .eq("id", settings.selected_quick_plan_id)
          .maybeSingle();
        return data ? { ...data, type: "quick" as const } : null;
      }
      if (settings.selected_protocol_id) {
        const { data } = await supabase
          .from("fasting_protocols")
          .select("name")
          .eq("id", settings.selected_protocol_id)
          .maybeSingle();
        return data ? { ...data, type: "protocol" as const } : null;
      }
      return null;
    },
    enabled: !!clientId,
  });

  const menuItems = [
    { label: "Sports Profile", to: "/client/sports" },
    { label: "Activity history", to: "/client/workouts" },
    { label: "Your exercises", to: "/client/workouts" },
    { label: "Progress photos", to: "/client/progress" },
    { label: "Recipe Collections", to: "/client/meal-plan" },
    { label: "Badges", to: "/client/badges" },
    { label: "Health", to: "/client/health" },
  ];

  return (
    <ClientLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">You</h1>
            <p className="text-sm text-muted-foreground">Set your fitness goal <button className="text-primary">(add)</button></p>
          </div>
          <div className="relative">
            <Avatar className="h-14 w-14">
              <AvatarImage src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${clientId}`} />
              <AvatarFallback>{(profile?.full_name || "?").substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="icon"
              className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-muted"
              onClick={() => navigate("/client/settings")}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <Card>
          <CardContent className="p-4 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⏱️</span>
              <div>
                <p className="text-xl font-bold text-foreground">0</p>
                <p className="text-xs text-muted-foreground">Training min</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔥</span>
              <div>
                <p className="text-xl font-bold text-foreground">0</p>
                <p className="text-xs text-muted-foreground">Streak days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Menu items */}
        <div className="divide-y divide-border">
          {/* Fasting Protocol row */}
          <button
            className="flex items-center justify-between w-full py-4 text-left"
            onClick={() => navigate("/client/choose-protocol")}
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <span className="text-foreground">Fasting Protocol</span>
            </div>
            <div className="flex items-center gap-2">
              {savedPlan ? (
                <span className="text-sm text-blue-400 font-medium">
                  {savedPlan.name}
                  {savedPlan.type === "quick" && ` (${savedPlan.fast_hours}:${savedPlan.eat_hours})`}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">None selected</span>
              )}
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </button>

          {menuItems.map((item) => (
            <button
              key={item.label}
              className="flex items-center justify-between w-full py-4 text-left"
              onClick={() => navigate(item.to)}
            >
              <span className="text-foreground">{item.label}</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Logout */}
        {!isImpersonating && (
          <button
            onClick={signOut}
            className="w-full text-center py-3 text-destructive font-medium"
          >
            Logout
          </button>
        )}
      </div>
    </ClientLayout>
  );
}
