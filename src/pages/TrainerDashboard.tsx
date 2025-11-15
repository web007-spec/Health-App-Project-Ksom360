import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Activity, Dumbbell, TrendingUp, Calendar, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isToday, isThisWeek } from "date-fns";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function TrainerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch trainer clients
  const { data: clients } = useQuery({
    queryKey: ["trainer-clients", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_clients")
        .select(`
          *,
          client_profile:profiles!client_id (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq("trainer_id", user?.id)
        .order("assigned_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch assigned workouts
  const { data: workouts } = useQuery({
    queryKey: ["trainer-workouts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_workouts")
        .select(`
          *,
          workout_plans (name, category, duration_minutes),
          client_profile:profiles!client_id (full_name)
        `)
        .eq("assigned_by", user?.id)
        .order("assigned_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch recent progress entries
  const { data: recentProgress } = useQuery({
    queryKey: ["recent-progress", user?.id],
    queryFn: async () => {
      if (!clients) return [];

      const clientIds = clients.map((c) => c.client_id);
      
      const { data, error } = await supabase
        .from("progress_entries")
        .select(`
          *,
          profiles:client_id (full_name, avatar_url)
        `)
        .in("client_id", clientIds)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!clients,
  });

  // Calculate stats
  const totalClients = clients?.length || 0;
  const activeClients = clients?.filter((c) => c.status === "active").length || 0;
  const totalWorkouts = workouts?.length || 0;
  const completedWorkouts = workouts?.filter((w) => w.completed_at).length || 0;
  const completionRate = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;

  // Recent activity stats
  const workoutsToday = workouts?.filter((w) => w.scheduled_date && isToday(parseISO(w.scheduled_date))).length || 0;
  const workoutsThisWeek = workouts?.filter((w) => w.scheduled_date && isThisWeek(parseISO(w.scheduled_date))).length || 0;

  // Workout completion trend (last 7 days)
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    return days;
  };

  const workoutTrend = getLast7Days().map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const completed = workouts?.filter(
      (w) => w.completed_at && format(parseISO(w.completed_at), "yyyy-MM-dd") === dayStr
    ).length || 0;
    
    return {
      date: format(day, "MMM d"),
      completed,
    };
  });

  // Client activity levels
  const clientActivity = clients?.slice(0, 5).map((client) => {
    const clientWorkouts = workouts?.filter((w) => w.client_id === client.client_id) || [];
    const completed = clientWorkouts.filter((w) => w.completed_at).length;
    
    return {
      name: client.client_profile?.full_name || "Unknown",
      workouts: completed,
    };
  }) || [];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Trainer Dashboard</h1>
          <p className="text-muted-foreground mt-1">Monitor your clients' progress and activity</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Clients"
            value={totalClients}
            icon={Users}
            change={`${activeClients} active`}
          />
          <StatCard
            title="Workouts Assigned"
            value={totalWorkouts}
            icon={Dumbbell}
            change={`${workoutsToday} today`}
          />
          <StatCard
            title="Completion Rate"
            value={`${completionRate}%`}
            icon={TrendingUp}
            change={`${completedWorkouts} of ${totalWorkouts}`}
          />
          <StatCard
            title="Active Today"
            value={workoutsToday}
            icon={Activity}
            change={`${workoutsThisWeek} this week`}
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Workout Completion Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Workout Completion Trend</CardTitle>
              <CardDescription>Last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={workoutTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Clients by Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Top Active Clients</CardTitle>
              <CardDescription>Completed workouts</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={clientActivity}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={80} />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="workouts" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Recent Workouts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Workouts</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/workouts")}>
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workouts?.slice(0, 5).map((workout) => (
                  <div key={workout.id} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{workout.workout_plans?.name}</p>
                        {workout.completed_at && (
                          <Badge variant="outline" className="bg-success/10 text-success">
                            Completed
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {workout.client_profile?.full_name || "Unknown Client"}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {workout.scheduled_date && format(parseISO(workout.scheduled_date), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>
                ))}

                {(!workouts || workouts.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No workouts assigned yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Progress Updates */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Progress Updates</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/clients")}>
                  View Clients
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentProgress?.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{entry.profiles?.full_name || "Unknown"}</p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        {entry.weight && <span>Weight: {entry.weight}kg</span>}
                        {entry.body_fat_percentage && <span>BF: {entry.body_fat_percentage}%</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(parseISO(entry.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}

                {(!recentProgress || recentProgress.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No recent progress updates
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Client Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Active Clients</p>
                  <Badge variant="outline" className="bg-success/10 text-success">Active</Badge>
                </div>
                <p className="text-3xl font-bold">{activeClients}</p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Paused</p>
                  <Badge variant="outline" className="bg-muted">Paused</Badge>
                </div>
                <p className="text-3xl font-bold">
                  {clients?.filter((c) => c.status === "paused").length || 0}
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <Badge variant="outline" className="bg-accent/10 text-accent">Pending</Badge>
                </div>
                <p className="text-3xl font-bold">
                  {clients?.filter((c) => c.status === "pending").length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
