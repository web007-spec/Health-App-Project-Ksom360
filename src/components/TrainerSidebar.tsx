import { useState } from "react";
import { LayoutDashboard, Users, Dumbbell, Calendar, CalendarClock, MessageSquare, Settings, TrendingUp, Target, CheckSquare, FileText, Play, Tags, Calculator, Activity, Heart, GraduationCap, Library, ChevronDown, ChevronRight, BookOpen, MonitorPlay } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Health", url: "/clients-health", icon: Heart },
  { title: "Messages", url: "/messages", icon: MessageSquare },
  { title: "Analytics", url: "/analytics", icon: TrendingUp },
  { title: "Scheduling", url: "/scheduling", icon: CalendarClock },
];

const libraryItems = [
  { title: "Exercises", url: "/exercises", icon: Dumbbell },
  { title: "Workouts", url: "/workouts", icon: Calendar },
  { title: "Programs", url: "/programs", icon: GraduationCap },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Goals", url: "/goals", icon: Target },
  { title: "Recipes", url: "/recipes", icon: FileText },
  { title: "Recipe Books", url: "/recipe-books", icon: BookOpen },
  { title: "Meal Plans", url: "/meal-plans", icon: Calendar },
  { title: "Macro Calculator", url: "/macro-calculator", icon: Calculator },
  { title: "Macro Tracking", url: "/macro-tracking", icon: Activity },
];

const onDemandItems = [
  { title: "Resources", url: "/resource-collections", icon: FileText },
  { title: "Workout Collections", url: "/workout-collections", icon: Play },
  { title: "On-demand Workouts", url: "/ondemand-workouts", icon: Dumbbell },
  { title: "Workout Labels", url: "/workout-labels", icon: Tags },
  { title: "Studio Programs", url: "/studio-programs", icon: GraduationCap },
  { title: "Settings", url: "/vibes-admin", icon: Settings },
];

const bottomItems = [
  { title: "Settings", url: "/settings", icon: Settings },
];

export function TrainerSidebar() {
  const { open } = useSidebar();
  const location = useLocation();

  const libraryPaths = libraryItems.map((i) => i.url);
  const isLibraryActive = libraryPaths.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"));
  const [libraryOpen, setLibraryOpen] = useState(isLibraryActive);

  const onDemandPaths = onDemandItems.map((i) => i.url);
  const isOnDemandActive = onDemandPaths.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"));
  const [onDemandOpen, setOnDemandOpen] = useState(isOnDemandActive);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 border-b border-sidebar-border" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)' }}>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="EverFit Stride" className="h-10 w-10 rounded-lg object-contain" />
            {open && (
              <div>
                <h2 className="font-bold text-sidebar-foreground">KSOM360</h2>
                <p className="text-xs text-sidebar-foreground/60">Trainer Portal</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Library collapsible group */}
              <SidebarMenuItem>
                <Collapsible open={libraryOpen} onOpenChange={setLibraryOpen}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className={`hover:bg-sidebar-accent w-full ${isLibraryActive ? "bg-sidebar-accent text-sidebar-primary font-medium" : ""}`}>
                      <Library className="h-4 w-4" />
                      <span className="flex-1 text-left">Library</span>
                      {open && (
                        libraryOpen ? <ChevronDown className="h-3.5 w-3.5 ml-auto" /> : <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenu className="pl-4 border-l border-sidebar-border ml-4 mt-1">
                      {libraryItems.map((item) => (
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
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>

              {/* On-Demand collapsible group */}
              <SidebarMenuItem>
                <Collapsible open={onDemandOpen} onOpenChange={setOnDemandOpen}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className={`hover:bg-sidebar-accent w-full ${isOnDemandActive ? "bg-sidebar-accent text-sidebar-primary font-medium" : ""}`}>
                      <MonitorPlay className="h-4 w-4" />
                      <span className="flex-1 text-left">On-demand</span>
                      {open && (
                        onDemandOpen ? <ChevronDown className="h-3.5 w-3.5 ml-auto" /> : <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenu className="pl-4 border-l border-sidebar-border ml-4 mt-1">
                      {onDemandItems.map((item) => (
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
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>
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
