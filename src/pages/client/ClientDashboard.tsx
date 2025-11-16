import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Dumbbell, TrendingUp, Apple, CheckCircle2, Clock, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format, isToday, isTomorrow, parseISO } from "date-fns";

const difficultyColors = {
  beginner: "bg-success/10 text-success",
  intermediate: "bg-accent/10 text-accent",
  advanced: "bg-destructive/10 text-destructive",
};

export default function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check if profile is complete, redirect to onboarding if not
  useQuery({
    queryKey: ["profile-check", user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user?.id)
        .single();

      if (!profile?.full_name || profile.full_name.trim() === '') {
        navigate("/client/onboarding");
      }
      
      return profile;
    },
    enabled: !!user?.id,
  });

  // Fetch client workouts
  const { data: clientWorkouts } = useQuery({
    queryKey: ["client-workouts-dashboard", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_workouts")
        .select(`
          *,
          workout_plan:workout_plans(*)
        `)
        .eq("client_id", user?.id)
        .order("scheduled_date", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch progress entries
  const { data: progressEntries } = useQuery({
    queryKey: ["progress-entries-recent", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("progress_entries")
        .select("*")
        .eq("client_id", user?.id)
        .order("entry_date", { ascending: false })
        .limit(2);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch nutrition logs for today
  const { data: todayNutrition } = useQuery({
    queryKey: ["nutrition-today", user?.id],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("nutrition_logs")
        .select("*")
        .eq("client_id", user?.id)
        .eq("log_date", today);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const totalWorkouts = clientWorkouts?.length || 0;
  const completedWorkouts = clientWorkouts?.filter((w) => w.completed_at)?.length || 0;
  const upcomingWorkouts = clientWorkouts?.filter((w) => !w.completed_at && w.scheduled_date) || [];
  const nextWorkouts = upcomingWorkouts.slice(0, 3);

  // Calculate nutrition totals
  const todayCalories = todayNutrition?.reduce((sum, log) => sum + (log.calories || 0), 0) || 0;
  const todayProtein = todayNutrition?.reduce((sum, log) => sum + (Number(log.protein) || 0), 0) || 0;

  // Get weight trend
  const latestWeight = progressEntries?.[0]?.weight;
  const previousWeight = progressEntries?.[1]?.weight;
  const weightChange = latestWeight && previousWeight ? latestWeight - previousWeight : null;

  const getDateLabel = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM d");
  };

  return (
    <ClientLayout>
      <div className="p-6 space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-3xl font-bold">Welcome Back!</h1>
          <p className="text-muted-foreground mt-1">Here's your fitness overview</p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Dumbbell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Workouts</p>
                  <p className="text-2xl font-bold">{totalWorkouts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{completedWorkouts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Weight</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold">
                      {latestWeight ? `${latestWeight}kg` : "—"}
                    </p>
                    {weightChange !== null && (
                      <span className={`text-xs ${weightChange > 0 ? "text-destructive" : "text-success"}`}>
                        {weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)}kg
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Apple className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Today's Calories</p>
                  <p className="text-2xl font-bold">{todayCalories}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming Workouts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Workouts
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/client/workouts")}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {nextWorkouts.length > 0 ? (
                nextWorkouts.map((workout) => (
                  <div
                    key={workout.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate("/client/workouts")}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{workout.workout_plan.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="secondary"
                          className={difficultyColors[workout.workout_plan.difficulty as keyof typeof difficultyColors]}
                        >
                          {workout.workout_plan.difficulty}
                        </Badge>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {workout.workout_plan.duration_minutes}min
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <span className="text-sm font-medium text-primary">
                        {workout.scheduled_date && getDateLabel(workout.scheduled_date)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No upcoming workouts scheduled</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {completedWorkouts > 0 && (
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="p-2 bg-success/10 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Workout Completed</p>
                    <p className="text-sm text-muted-foreground">
                      You've completed {completedWorkouts} workout{completedWorkouts > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              )}

              {progressEntries && progressEntries.length > 0 && (
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Progress Updated</p>
                    <p className="text-sm text-muted-foreground">
                      Last logged on {format(parseISO(progressEntries[0].entry_date), "MMM d")}
                    </p>
                  </div>
                </div>
              )}

              {todayNutrition && todayNutrition.length > 0 && (
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <Apple className="h-4 w-4 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Nutrition Logged</p>
                    <p className="text-sm text-muted-foreground">
                      {todayNutrition.length} meal{todayNutrition.length > 1 ? "s" : ""} logged today
                    </p>
                  </div>
                </div>
              )}

              {completedWorkouts === 0 && (!progressEntries || progressEntries.length === 0) && (!todayNutrition || todayNutrition.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <Button className="w-full gap-2" onClick={() => navigate("/client/workouts")}>
                <Dumbbell className="h-4 w-4" />
                Start Workout
              </Button>
              <Button variant="outline" className="w-full gap-2" onClick={() => navigate("/client/progress")}>
                <TrendingUp className="h-4 w-4" />
                Log Progress
              </Button>
              <Button variant="outline" className="w-full gap-2" onClick={() => navigate("/client/nutrition")}>
                <Apple className="h-4 w-4" />
                Log Meal
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
