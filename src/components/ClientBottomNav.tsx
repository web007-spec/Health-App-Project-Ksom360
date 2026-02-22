import { ClipboardList, Dumbbell, User, Play, Target, Music2 } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useClientFeatureSettings } from "@/hooks/useClientFeatureSettings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  featureKey?: string;
  badgeKey?: string; // key used to identify which badge query applies
}

const navItems: NavItem[] = [
  { label: "Today", to: "/client/dashboard", icon: ClipboardList },
  { label: "Coaching", to: "/client/coaching", icon: Dumbbell, badgeKey: "coaching" },
  { label: "Goals", to: "/client/goals", icon: Target, featureKey: "goals_enabled", badgeKey: "goals" },
  { label: "On-demand", to: "/client/on-demand", icon: Play, badgeKey: "ondemand" },
  { label: "Vibes", to: "/client/vibes", icon: Music2 },
  { label: "You", to: "/client/profile", icon: User },
];

export function ClientBottomNav() {
  const { settings } = useClientFeatureSettings();
  const { userRole } = useAuth();
  const clientId = useEffectiveClientId();

  const enabled = !!clientId && userRole !== "trainer";

  // --- Goals badge ---
  const { data: hasUnseenGoal } = useQuery({
    queryKey: ["unseen-goals-badge", clientId],
    queryFn: async () => {
      const lastSeen = localStorage.getItem(`goals-last-seen-${clientId}`);
      const query = supabase
        .from("fitness_goals")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId!)
        .eq("status", "active");
      if (lastSeen) query.gt("created_at", lastSeen);
      const { count } = await query;
      return (count ?? 0) > 0;
    },
    enabled,
    refetchInterval: 30_000,
  });

  // --- Coaching badge: unseen workouts, tasks, or habits ---
  const { data: hasUnseenCoaching } = useQuery({
    queryKey: ["unseen-coaching-badge", clientId],
    queryFn: async () => {
      const lastSeen = localStorage.getItem(`coaching-last-seen-${clientId}`);
      if (!lastSeen) {
        // First visit — check if anything exists at all
        const [{ count: wCount }, { count: tCount }, { count: hCount }] = await Promise.all([
          supabase.from("client_workouts").select("id", { count: "exact", head: true }).eq("client_id", clientId!),
          supabase.from("client_tasks").select("id", { count: "exact", head: true }).eq("client_id", clientId!).is("completed_at", null),
          supabase.from("client_habits").select("id", { count: "exact", head: true }).eq("client_id", clientId!).eq("is_active", true),
        ]);
        return ((wCount ?? 0) + (tCount ?? 0) + (hCount ?? 0)) > 0;
      }
      const [{ count: wCount }, { count: tCount }, { count: hCount }] = await Promise.all([
        supabase.from("client_workouts").select("id", { count: "exact", head: true }).eq("client_id", clientId!).gt("assigned_at", lastSeen),
        supabase.from("client_tasks").select("id", { count: "exact", head: true }).eq("client_id", clientId!).gt("assigned_at", lastSeen).is("completed_at", null),
        supabase.from("client_habits").select("id", { count: "exact", head: true }).eq("client_id", clientId!).gt("created_at", lastSeen).eq("is_active", true),
      ]);
      return ((wCount ?? 0) + (tCount ?? 0) + (hCount ?? 0)) > 0;
    },
    enabled,
    refetchInterval: 30_000,
  });

  // --- On-demand badge: new collection or workout collection access granted ---
  const { data: hasUnseenOnDemand } = useQuery({
    queryKey: ["unseen-ondemand-badge", clientId],
    queryFn: async () => {
      const lastSeen = localStorage.getItem(`ondemand-last-seen-${clientId}`);
      if (!lastSeen) {
        const [{ count: cCount }, { count: wCount }] = await Promise.all([
          supabase.from("client_collection_access").select("id", { count: "exact", head: true }).eq("client_id", clientId!),
          supabase.from("client_workout_collection_access").select("id", { count: "exact", head: true }).eq("client_id", clientId!),
        ]);
        return ((cCount ?? 0) + (wCount ?? 0)) > 0;
      }
      const [{ count: cCount }, { count: wCount }] = await Promise.all([
        supabase.from("client_collection_access").select("id", { count: "exact", head: true }).eq("client_id", clientId!).gt("granted_at", lastSeen),
        supabase.from("client_workout_collection_access").select("id", { count: "exact", head: true }).eq("client_id", clientId!).gt("granted_at", lastSeen),
      ]);
      return ((cCount ?? 0) + (wCount ?? 0)) > 0;
    },
    enabled,
    refetchInterval: 30_000,
  });

  const badgeMap: Record<string, boolean> = {
    goals: !!hasUnseenGoal,
    coaching: !!hasUnseenCoaching,
    ondemand: !!hasUnseenOnDemand,
  };

  const visibleItems = navItems.filter((item) => {
    if (!item.featureKey) return true;
    return settings[item.featureKey as keyof typeof settings] !== false;
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {visibleItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full text-muted-foreground transition-colors",
                isActive && "text-primary"
              )
            }
          >
            <div className="relative">
              <item.icon className="h-5 w-5" />
              {item.badgeKey && badgeMap[item.badgeKey] && userRole !== "trainer" && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive border border-card" />
              )}
            </div>
            <span className="text-[11px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
