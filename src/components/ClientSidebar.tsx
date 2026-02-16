import { Home, Dumbbell, TrendingUp, Utensils, MessageSquare, Settings, CalendarDays, Target, CheckSquare, FileText, Play, Activity, Heart, CalendarClock } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useClientFeatureSettings } from "@/hooks/useClientFeatureSettings";

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  featureKey?: string;
}

const mainItems: MenuItem[] = [
  { title: "Home", url: "/client/dashboard", icon: Home },
  { title: "My Workouts", url: "/client/workouts", icon: Dumbbell, featureKey: "training_enabled" },
  { title: "Calendar", url: "/client/calendar", icon: CalendarDays, featureKey: "training_enabled" },
  { title: "Goals", url: "/client/goals", icon: Target, featureKey: "goals_enabled" },
  { title: "Tasks", url: "/client/tasks", icon: CheckSquare, featureKey: "tasks_enabled" },
  { title: "Progress", url: "/client/progress", icon: TrendingUp, featureKey: "body_metrics_enabled" },
  { title: "Health", url: "/client/health", icon: Heart, featureKey: "activity_logging_enabled" },
  { title: "Meal Plan", url: "/client/meal-plan", icon: Utensils, featureKey: "food_journal_enabled" },
  { title: "Nutrition", url: "/client/nutrition", icon: Utensils, featureKey: "food_journal_enabled" },
  { title: "Nutrition Dashboard", url: "/client/nutrition-dashboard", icon: Activity, featureKey: "macros_enabled" },
  { title: "Messages", url: "/client/messages", icon: MessageSquare, featureKey: "messages_enabled" },
  { title: "Appointments", url: "/client/appointments", icon: CalendarClock },
];

const ondemandItems: MenuItem[] = [
  { title: "Resource Hub", url: "/client/resource-hub", icon: FileText },
  { title: "Workout Hub", url: "/client/workout-hub", icon: Play, featureKey: "training_enabled" },
];

const bottomItems: MenuItem[] = [
  { title: "Settings", url: "/client/settings", icon: Settings },
];

export function ClientSidebar() {
  const { open } = useSidebar();
  const { settings } = useClientFeatureSettings();

  const isVisible = (item: MenuItem) => {
    if (!item.featureKey) return true;
    return settings[item.featureKey as keyof typeof settings] !== false;
  };

  const visibleMainItems = mainItems.filter(isVisible);
  const visibleOndemandItems = ondemandItems.filter(isVisible);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Dumbbell className="h-6 w-6 text-primary-foreground" />
            </div>
            {open && (
              <div>
                <h2 className="font-bold text-sidebar-foreground">FitCoach Pro</h2>
                <p className="text-xs text-sidebar-foreground/60">Client Portal</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleOndemandItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>On-Demand</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleOndemandItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className="hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <div className="mt-auto">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {bottomItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
