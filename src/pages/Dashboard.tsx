import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { ClientCard } from "@/components/ClientCard";
import { Users, Dumbbell, TrendingUp, DollarSign, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCreateDemoClient } from "@/hooks/useCreateDemoClient";

const mockClients = [
  {
    name: "Sarah Johnson",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    program: "Strength Training Pro",
    progress: 78,
    lastCheckIn: "2 days ago",
    status: "active" as const,
  },
  {
    name: "Mike Rodriguez",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
    program: "Weight Loss Intensive",
    progress: 45,
    lastCheckIn: "1 day ago",
    status: "active" as const,
  },
  {
    name: "Emily Chen",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
    program: "Marathon Prep",
    progress: 92,
    lastCheckIn: "Today",
    status: "active" as const,
  },
  {
    name: "David Kim",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
    program: "Muscle Building",
    progress: 34,
    lastCheckIn: "5 days ago",
    status: "paused" as const,
  },
];

const recentActivity = [
  { client: "Sarah Johnson", action: "Completed workout: Upper Body Strength", time: "2h ago" },
  { client: "Mike Rodriguez", action: "Logged meal: High Protein Breakfast", time: "4h ago" },
  { client: "Emily Chen", action: "Achieved goal: 5K Run under 25 min", time: "6h ago" },
  { client: "Alex Turner", action: "Sent message about nutrition plan", time: "1d ago" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const createDemoClient = useCreateDemoClient();

  // Fetch trainer clients
  const { data: clients } = useQuery({
    queryKey: ["trainer-clients", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_clients")
        .select(`
          *,
          client:profiles!trainer_clients_client_id_fkey(*)
        `)
        .eq("trainer_id", user?.id)
        .order("assigned_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch workout plans count
  const { data: workoutStats } = useQuery({
    queryKey: ["workout-stats", user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("workout_plans")
        .select("*", { count: "exact", head: true })
        .eq("trainer_id", user?.id);

      if (error) throw error;
      return { total: count || 0 };
    },
    enabled: !!user?.id,
  });

  // Calculate stats
  const activeClients = clients?.filter(c => c.status === "active").length || 0;
  const totalWorkouts = workoutStats?.total || 0;
  
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Welcome back, Coach!</h1>
            <p className="text-muted-foreground mt-1">Here's what's happening with your clients today.</p>
          </div>
          <Button 
            size="lg" 
            className="gap-2"
            onClick={() => createDemoClient.mutate(undefined)}
            disabled={createDemoClient.isPending}
          >
            {createDemoClient.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Plus className="h-4 w-4" />
            Create Demo Client
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active Clients"
            value={activeClients}
            change={activeClients > 0 ? `+${activeClients} total` : "No clients yet"}
            changeType={activeClients > 0 ? "positive" : "neutral"}
            icon={Users}
          />
          <StatCard
            title="Workouts Created"
            value={totalWorkouts}
            change={totalWorkouts > 0 ? "In your library" : "Create your first"}
            changeType={totalWorkouts > 0 ? "positive" : "neutral"}
            icon={Dumbbell}
          />
          <StatCard
            title="Avg. Progress"
            value="--"
            change="Coming soon"
            changeType="neutral"
            icon={TrendingUp}
          />
          <StatCard
            title="Monthly Revenue"
            value="--"
            change="Coming soon"
            changeType="neutral"
            icon={DollarSign}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Active Clients */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Active Clients</h2>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            {clients && clients.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {clients.slice(0, 4).map((relationship) => (
                  <ClientCard
                    key={relationship.id}
                    name={relationship.client?.full_name || relationship.client?.email || "Client"}
                    avatar={`https://api.dicebear.com/7.x/avataaars/svg?seed=${relationship.client?.email}`}
                    program="Training Program"
                    progress={0}
                    lastCheckIn="Recently"
                    status={relationship.status}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No clients yet</h3>
                  <p className="text-muted-foreground mb-4 max-w-sm">
                    Start building your roster by adding your first client
                  </p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Client
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recent Activity */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Recent Activity</h2>
            <Card>
              <CardContent className="p-4">
                {clients && clients.length > 0 ? (
                  <div className="space-y-4">
                    {clients.slice(0, 4).map((relationship, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {relationship.client?.full_name || relationship.client?.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {relationship.status === "active" ? "Active client" : "Pending approval"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Added {new Date(relationship.assigned_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No activity yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Workout Plan
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  Add New Client
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
