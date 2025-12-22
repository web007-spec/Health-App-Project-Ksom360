import { Home, Dumbbell, TrendingUp, Utensils, MessageSquare, Settings, CalendarDays, Target, CheckSquare, FileText, Play, Activity, Heart } from "lucide-react";
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

const mainItems = [
  { title: "Home", url: "/client/dashboard", icon: Home },
  { title: "My Workouts", url: "/client/workouts", icon: Dumbbell },
  { title: "Calendar", url: "/client/calendar", icon: CalendarDays },
  { title: "Goals", url: "/client/goals", icon: Target },
  { title: "Tasks", url: "/client/tasks", icon: CheckSquare },
  { title: "Progress", url: "/client/progress", icon: TrendingUp },
  { title: "Health", url: "/client/health", icon: Heart },
  { title: "Nutrition", url: "/client/nutrition", icon: Utensils },
  { title: "Nutrition Dashboard", url: "/client/nutrition-dashboard", icon: Activity },
  { title: "Messages", url: "/messages", icon: MessageSquare },
];

const ondemandItems = [
  { title: "Resource Hub", url: "/client/resource-hub", icon: FileText },
  { title: "Workout Hub", url: "/client/workout-hub", icon: Play },
];

const bottomItems = [
  { title: "Settings", url: "/client/settings", icon: Settings },
];

export function ClientSidebar() {
  const { open } = useSidebar();

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
              {mainItems.map((item) => (
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

        <SidebarGroup>
          <SidebarGroupLabel>On-Demand</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ondemandItems.map((item) => (
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
