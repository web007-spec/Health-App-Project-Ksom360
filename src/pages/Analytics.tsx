import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Users, Dumbbell, Activity, Calendar, Download, Swords, Trophy } from "lucide-react";
import { CoachIntelligenceTab } from "@/components/CoachIntelligenceTab";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { format, subDays, subMonths, parseISO, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

type TimeRange = "7days" | "30days" | "3months" | "6months" | "1year";

export default function Analytics() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>("30days");
  const [selectedClient, setSelectedClient] = useState<string>("all");

  // Calculate date range
  const getDateRange = () => {
    const end = new Date();
    let start = new Date();

    switch (timeRange) {
      case "7days":
        start = subDays(end, 7);
        break;
      case "30days":
        start = subDays(end, 30);
        break;
      case "3months":
        start = subMonths(end, 3);
        break;
      case "6months":
        start = subMonths(end, 6);
        break;
      case "1year":
        start = subMonths(end, 12);
        break;
    }

    return { start, end };
  };

  const { start: startDate, end: endDate } = getDateRange();

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ["analytics-clients", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_clients")
        .select(`
          client_id,
          status,
          client_profile:profiles!client_id (
            full_name
          )
        `)
        .eq("trainer_id", user?.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch workouts
  const { data: workouts } = useQuery({
    queryKey: ["analytics-workouts", user?.id, selectedClient, timeRange],
    queryFn: async () => {
      let query = supabase
        .from("client_workouts")
        .select(`
          *,
          workout_plans (name, category, difficulty, duration_minutes)
        `)
        .eq("assigned_by", user?.id)
        .gte("assigned_at", startDate.toISOString())
        .lte("assigned_at", endDate.toISOString());

      if (selectedClient !== "all") {
        query = query.eq("client_id", selectedClient);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch progress entries
  const { data: progressEntries } = useQuery({
    queryKey: ["analytics-progress", user?.id, selectedClient, timeRange],
    queryFn: async () => {
      const clientIds = selectedClient === "all"
        ? clients?.map((c) => c.client_id) || []
        : [selectedClient];

      if (clientIds.length === 0) return [];

      const { data, error } = await supabase
        .from("progress_entries")
        .select(`
          *,
          client_profile:profiles!client_id (full_name)
        `)
        .in("client_id", clientIds)
        .gte("entry_date", format(startDate, "yyyy-MM-dd"))
        .lte("entry_date", format(endDate, "yyyy-MM-dd"))
        .order("entry_date", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!clients,
  });

  // Fetch nutrition logs
  const { data: nutritionLogs } = useQuery({
    queryKey: ["analytics-nutrition", user?.id, selectedClient, timeRange],
    queryFn: async () => {
      const clientIds = selectedClient === "all"
        ? clients?.map((c) => c.client_id) || []
        : [selectedClient];

      if (clientIds.length === 0) return [];

      const { data, error } = await supabase
        .from("nutrition_logs")
        .select("*")
        .in("client_id", clientIds)
        .gte("log_date", format(startDate, "yyyy-MM-dd"))
        .lte("log_date", format(endDate, "yyyy-MM-dd"));

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!clients,
  });

  // Fetch sport event completions
  const { data: sportCompletions } = useQuery({
    queryKey: ["analytics-sport-completions", user?.id, selectedClient, timeRange],
    queryFn: async () => {
      const clientIds = selectedClient === "all"
        ? clients?.map((c) => c.client_id) || []
        : [selectedClient];

      if (clientIds.length === 0) return [];

      // Fetch completions
      const { data: completions, error: compError } = await supabase
        .from("sport_event_completions" as any)
        .select("*")
        .in("client_id", clientIds)
        .gte("completed_at", startDate.toISOString())
        .lte("completed_at", endDate.toISOString());

      if (compError) throw compError;
      if (!completions || completions.length === 0) return [];

      // Fetch associated sport events
      const eventIds = [...new Set((completions as any[]).map((c: any) => c.sport_event_id))];
      const { data: events, error: evError } = await supabase
        .from("sport_schedule_events")
        .select("*")
        .in("id", eventIds);

      if (evError) throw evError;

      const eventMap = new Map((events || []).map((e: any) => [e.id, e]));
      return (completions as any[]).map((c: any) => ({
        ...c,
        sport_event: eventMap.get(c.sport_event_id) || null,
      }));
    },
    enabled: !!user?.id && !!clients,
  });

  // Calculate metrics
  const totalWorkouts = workouts?.length || 0;
  const completedWorkouts = workouts?.filter((w) => w.completed_at).length || 0;
  const completionRate = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;
  const avgWorkoutsPerWeek = Math.round((totalWorkouts / ((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))) * 10) / 10;

  // Workout completion trend
  const getDaysInRange = () => {
    const days = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const workoutTrend = getDaysInRange().map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const assigned = workouts?.filter((w) => format(parseISO(w.assigned_at), "yyyy-MM-dd") === dayStr).length || 0;
    const completed = workouts?.filter((w) => w.completed_at && format(parseISO(w.completed_at), "yyyy-MM-dd") === dayStr).length || 0;

    return {
      date: format(day, "MMM d"),
      assigned,
      completed,
    };
  });

  // Workout by category
  const workoutsByCategory = workouts?.reduce((acc: any, workout) => {
    const category = workout.workout_plans?.category || "Other";
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  const categoryData = Object.entries(workoutsByCategory || {}).map(([name, value]) => ({
    name,
    value,
  }));

  // Workout by difficulty
  const workoutsByDifficulty = workouts?.reduce((acc: any, workout) => {
    const difficulty = workout.workout_plans?.difficulty || "Unknown";
    acc[difficulty] = (acc[difficulty] || 0) + 1;
    return acc;
  }, {});

  const difficultyData = Object.entries(workoutsByDifficulty || {}).map(([name, value]) => ({
    name,
    value,
  }));

  // Progress trends
  const weightTrend = progressEntries
    ?.filter((e) => e.weight)
    .map((e) => ({
      date: format(parseISO(e.entry_date), "MMM d"),
      weight: e.weight,
    })) || [];

  const bodyFatTrend = progressEntries
    ?.filter((e) => e.body_fat_percentage)
    .map((e) => ({
      date: format(parseISO(e.entry_date), "MMM d"),
      bodyFat: e.body_fat_percentage,
    })) || [];

  // Nutrition averages
  const avgCalories = nutritionLogs?.length
    ? Math.round(nutritionLogs.reduce((sum, log) => sum + (log.calories || 0), 0) / nutritionLogs.length)
    : 0;
  const avgProtein = nutritionLogs?.length
    ? Math.round(nutritionLogs.reduce((sum, log) => sum + (log.protein || 0), 0) / nutritionLogs.length)
    : 0;

  const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))", "hsl(var(--destructive))"];

  // Calculate week-over-week change
  const prevPeriodWorkouts = workouts?.filter((w) => {
    const assignedDate = parseISO(w.assigned_at);
    const prevStart = new Date(startDate);
    prevStart.setDate(prevStart.getDate() - 7);
    return isWithinInterval(assignedDate, { start: prevStart, end: startDate });
  }).length || 0;

  const workoutChange = prevPeriodWorkouts > 0
    ? Math.round(((totalWorkouts - prevPeriodWorkouts) / prevPeriodWorkouts) * 100)
    : 0;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground mt-1">Track performance and trends over time</p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients?.map((client) => (
                  <SelectItem key={client.client_id} value={client.client_id}>
                    {client.client_profile?.full_name || "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="3months">Last 3 months</SelectItem>
                <SelectItem value="6months">Last 6 months</SelectItem>
                <SelectItem value="1year">Last year</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Workouts</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <h3 className="text-3xl font-bold">{totalWorkouts}</h3>
                    {workoutChange !== 0 && (
                      <Badge variant={workoutChange > 0 ? "default" : "destructive"} className="gap-1">
                        {workoutChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {Math.abs(workoutChange)}%
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Dumbbell className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                  <h3 className="text-3xl font-bold mt-2">{completionRate}%</h3>
                </div>
                <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg/Week</p>
                  <h3 className="text-3xl font-bold mt-2">{avgWorkoutsPerWeek}</h3>
                </div>
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Clients</p>
                  <h3 className="text-3xl font-bold mt-2">
                    {clients?.filter((c) => c.status === "active").length || 0}
                  </h3>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="intelligence" className="space-y-6">
          <TabsList>
            <TabsTrigger value="intelligence">Coach Intelligence</TabsTrigger>
            <TabsTrigger value="workouts">Workouts</TabsTrigger>
            <TabsTrigger value="sports">Sports</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
          </TabsList>

          <TabsContent value="intelligence">
            <CoachIntelligenceTab trainerId={user?.id!} />
          </TabsContent>

          {/* Workouts Tab */}
          <TabsContent value="workouts" className="space-y-6">
            {/* Workout Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Workout Activity Trend</CardTitle>
                <CardDescription>Assigned vs completed workouts over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={workoutTrend}>
                    <defs>
                      <linearGradient id="colorAssigned" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="assigned"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorAssigned)"
                      name="Assigned"
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      stroke="hsl(var(--success))"
                      fillOpacity={1}
                      fill="url(#colorCompleted)"
                      name="Completed"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category & Difficulty Charts */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Workouts by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Workouts by Difficulty</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={difficultyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Sports Tab */}
          <TabsContent value="sports" className="space-y-6">
            {/* Sport Stats Cards */}
            {(() => {
              const totalSportEvents = sportCompletions?.length || 0;
              const completedEvents = sportCompletions?.filter((s: any) => s.status === 'completed').length || 0;
              const incompleteEvents = sportCompletions?.filter((s: any) => s.status === 'incomplete').length || 0;
              const missedEvents = sportCompletions?.filter((s: any) => s.status === 'missed').length || 0;
              const practiceEvents = sportCompletions?.filter((s: any) => {
                const et = s.sport_event?.event_type;
                return et === 'practice';
              }).length || 0;
              const gameEvents = sportCompletions?.filter((s: any) => {
                const et = s.sport_event?.event_type;
                return et === 'game' || et === 'event';
              }).length || 0;
              const practiceCompleted = sportCompletions?.filter((s: any) => s.sport_event?.event_type === 'practice' && s.status === 'completed').length || 0;
              const gameCompleted = sportCompletions?.filter((s: any) => (s.sport_event?.event_type === 'game' || s.sport_event?.event_type === 'event') && s.status === 'completed').length || 0;
              const sportCompletionRate = totalSportEvents > 0 ? Math.round((completedEvents / totalSportEvents) * 100) : 0;

              const sportByStatus = [
                { name: "Completed", value: completedEvents },
                { name: "Incomplete", value: incompleteEvents },
                { name: "Missed", value: missedEvents },
              ].filter(d => d.value > 0);

              const SPORT_COLORS = ["hsl(var(--success))", "#eab308", "hsl(var(--destructive))"];

              return (
                <>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                            <h3 className="text-3xl font-bold mt-2">{totalSportEvents}</h3>
                          </div>
                          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Activity className="h-6 w-6 text-primary" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Attendance Rate</p>
                            <h3 className="text-3xl font-bold mt-2">{sportCompletionRate}%</h3>
                          </div>
                          <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-success" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Practices</p>
                            <h3 className="text-3xl font-bold mt-2">{practiceCompleted}/{practiceEvents}</h3>
                          </div>
                          <div className="h-12 w-12 rounded-xl bg-sky-500/10 flex items-center justify-center">
                            <Trophy className="h-6 w-6 text-sky-500" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Games</p>
                            <h3 className="text-3xl font-bold mt-2">{gameCompleted}/{gameEvents}</h3>
                          </div>
                          <div className="h-12 w-12 rounded-xl bg-rose-500/10 flex items-center justify-center">
                            <Swords className="h-6 w-6 text-rose-500" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Attendance Breakdown</CardTitle>
                        <CardDescription>Completed vs missed vs incomplete</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {sportByStatus.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={sportByStatus}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                outerRadius={80}
                                dataKey="value"
                              >
                                {sportByStatus.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={SPORT_COLORS[index % SPORT_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                            No sport event data available
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Sport Events</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {sportCompletions && sportCompletions.length > 0 ? (
                          <div className="space-y-3">
                            {sportCompletions.slice(0, 10).map((sc: any) => {
                              const isGame = sc.sport_event?.event_type === 'game' || sc.sport_event?.event_type === 'event';
                              return (
                                <div key={sc.id} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${isGame ? 'bg-rose-500/10' : 'bg-sky-500/10'}`}>
                                      {isGame ? <Swords className="h-4 w-4 text-rose-500" /> : <Trophy className="h-4 w-4 text-sky-500" />}
                                    </div>
                                    <div>
                                      <p className="font-medium text-sm">{sc.sport_event?.title || 'Sport Event'}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {sc.completed_at ? format(parseISO(sc.completed_at), "MMM d, yyyy") : ''}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge variant={sc.status === 'completed' ? 'default' : sc.status === 'missed' ? 'destructive' : 'secondary'}>
                                    {sc.status}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                            No sport event data available
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              );
            })()}
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Weight Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Weight Progress</CardTitle>
                  <CardDescription>Weight tracking over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {weightTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={weightTrend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="weight"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--primary))", r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No weight data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Body Fat Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Body Fat %</CardTitle>
                  <CardDescription>Body fat percentage over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {bodyFatTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={bodyFatTrend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="bodyFat"
                          stroke="hsl(var(--accent))"
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--accent))", r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No body fat data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Progress Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Progress Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Progress Entries</p>
                    <p className="text-2xl font-bold mt-1">{progressEntries?.length || 0}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Latest Weight</p>
                    <p className="text-2xl font-bold mt-1">
                      {weightTrend.length > 0 ? `${weightTrend[weightTrend.length - 1].weight}kg` : "—"}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Latest Body Fat</p>
                    <p className="text-2xl font-bold mt-1">
                      {bodyFatTrend.length > 0 ? `${bodyFatTrend[bodyFatTrend.length - 1].bodyFat}%` : "—"}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Tracking Frequency</p>
                    <p className="text-2xl font-bold mt-1">
                      {progressEntries?.length
                        ? `${Math.round((progressEntries.length / ((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))) * 10) / 10}/week`
                        : "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Nutrition Tab */}
          <TabsContent value="nutrition" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Nutrition Overview</CardTitle>
                <CardDescription>Average daily nutrition metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Avg Calories</p>
                    <p className="text-2xl font-bold mt-1">{avgCalories}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Avg Protein</p>
                    <p className="text-2xl font-bold mt-1">{avgProtein}g</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Meals Logged</p>
                    <p className="text-2xl font-bold mt-1">{nutritionLogs?.length || 0}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Tracking Days</p>
                    <p className="text-2xl font-bold mt-1">
                      {nutritionLogs?.length
                        ? new Set(nutritionLogs.map((log) => log.log_date)).size
                        : 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {nutritionLogs && nutritionLogs.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Nutrition Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {nutritionLogs.slice(0, 10).map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{log.meal_name}</p>
                          <p className="text-sm text-muted-foreground">{format(parseISO(log.log_date), "MMM d, yyyy")}</p>
                        </div>
                        <div className="flex gap-4 text-sm">
                          {log.calories && <span>{log.calories} cal</span>}
                          {log.protein && <span>{log.protein}g protein</span>}
                          {log.carbs && <span>{log.carbs}g carbs</span>}
                          {log.fats && <span>{log.fats}g fat</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No nutrition data available for this period</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
