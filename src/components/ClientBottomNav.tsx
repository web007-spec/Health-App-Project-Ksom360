import { ClipboardList, Dumbbell, User, Play, Target } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useClientFeatureSettings } from "@/hooks/useClientFeatureSettings";

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  featureKey?: string;
}

const navItems: NavItem[] = [
  { label: "Today", to: "/client/dashboard", icon: ClipboardList },
  { label: "Coaching", to: "/client/coaching", icon: Dumbbell },
  { label: "Goals", to: "/client/goals", icon: Target, featureKey: "goals_enabled" },
  { label: "On-demand", to: "/client/on-demand", icon: Play },
  { label: "You", to: "/client/profile", icon: User },
];

export function ClientBottomNav() {
  const { settings } = useClientFeatureSettings();

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
            <item.icon className="h-5 w-5" />
            <span className="text-[11px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
