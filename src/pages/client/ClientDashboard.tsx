import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Dumbbell, CheckCircle2, Circle, UtensilsCrossed, Footprints, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format, isToday, parseISO } from "date-fns";

export default function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Check if profile is complete, redirect to onboarding if not
  const { data: profile } = useQuery({
    queryKey: ["profile-check", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user?.id)
        .single();

      if (!data?.full_name || data.full_name.trim() === '') {
        navigate("/client/onboarding");
      }
      
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch today's workouts
  const { data: clientWorkouts } = useQuery({
    queryKey: ["client-workouts-today", user?.id],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
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

  // Fetch today's tasks
  const { data: tasks } = useQuery({
    queryKey: ["client-tasks-today", user?.id],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("client_tasks")
        .select("*")
        .eq("client_id", user?.id)
        .or(`due_date.eq.${today},due_date.is.null`)
        .order("assigned_at", { ascending: false });

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

  // Complete task mutation
  const completeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("client_tasks")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", taskId)
        .eq("client_id", user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-tasks-today"] });
    },
  });

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const todayDate = format(new Date(), "EEEE, MMM d").toUpperCase();

  // Today's workouts (all uncompleted scheduled for today)
  const todaysWorkouts = clientWorkouts?.filter((w) => {
    if (w.completed_at) return false;
    if (w.scheduled_date && isToday(parseISO(w.scheduled_date))) return true;
    return false;
  }) || [];

  const isRestDay = todaysWorkouts.length === 0;

  // Task stats
  const pendingTasks = tasks?.filter((t) => !t.completed_at) || [];
  const completedTaskCount = tasks?.filter((t) => t.completed_at)?.length || 0;
  const totalTaskCount = tasks?.length || 0;

  // Nutrition stats
  const todayMealCount = todayNutrition?.length || 0;
  const todayCalories = todayNutrition?.reduce((sum, log) => sum + (log.calories || 0), 0) || 0;

  return (
    <ClientLayout>
      <div className="p-4 pb-8 max-w-lg mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="text-xs font-semibold text-muted-foreground tracking-wider">{todayDate}</p>
            <h1 className="text-2xl font-bold mt-0.5">Hello, {firstName}! 👋</h1>
            <p className="text-sm text-muted-foreground font-medium mt-0.5">Let's do this</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => navigate("/client/settings")}
          >
            <Bell className="h-5 w-5" />
          </Button>
        </div>

        {/* Today's Workouts */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Today's Workout{todaysWorkouts.length > 1 ? "s" : ""}
          </h2>
          {isRestDay ? (
            <Card className="overflow-hidden">
              <CardContent className="p-6 text-center">
                <Dumbbell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-lg font-semibold">Rest Day</p>
                <p className="text-sm text-muted-foreground">No workouts scheduled for today. Enjoy your rest!</p>
              </CardContent>
            </Card>
          ) : (
            <div className={todaysWorkouts.length > 1 ? "flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 scrollbar-hide" : ""}>
              {todaysWorkouts.map((workout) => (
                <Card
                  key={workout.id}
                  className={`overflow-hidden cursor-pointer hover:shadow-md transition-shadow shrink-0 snap-center ${todaysWorkouts.length > 1 ? "w-[calc(100%-2rem)]" : "w-full"}`}
                  onClick={() => navigate("/client/workouts")}
                >
                  <div className="relative h-44 bg-gradient-to-br from-primary/20 to-primary/5">
                    {workout.workout_plan?.image_url ? (
                      <img
                        src={workout.workout_plan.image_url}
                        alt={workout.workout_plan.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Dumbbell className="h-16 w-16 text-primary/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Today's Workout</p>
                      <p className="text-lg font-bold text-white">{workout.workout_plan?.name}</p>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <Button className="w-full" size="lg" onClick={(e) => {
                      e.stopPropagation();
                      navigate("/client/workouts");
                    }}>
                      Start Workout
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Tasks */}
        {tasks && tasks.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Tasks ({completedTaskCount}/{totalTaskCount})
            </h2>
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {tasks.slice(0, 5).map((task) => {
                  const isCompleted = !!task.completed_at;
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => {
                        if (!isCompleted) completeMutation.mutate(task.id);
                      }}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                      <span className={`text-sm flex-1 ${isCompleted ? "line-through text-muted-foreground" : "font-medium"}`}>
                        {task.name}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            {tasks.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-1 text-xs"
                onClick={() => navigate("/client/tasks")}
              >
                View all tasks
              </Button>
            )}
          </div>
        )}

        {/* Food Journal */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Food Journal
          </h2>
          <Card
            className="cursor-pointer hover:shadow-sm transition-shadow"
            onClick={() => navigate("/client/nutrition")}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-xl">
                <UtensilsCrossed className="h-6 w-6 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">
                  {todayMealCount > 0
                    ? `${todayMealCount} meal${todayMealCount > 1 ? "s" : ""} logged • ${todayCalories} cal`
                    : "What did you eat today?"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {todayMealCount > 0 ? "Tap to add more" : "Track your meals and macros"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/client/nutrition");
                }}
              >
                Add meal
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Step Tracker / Health */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Step Tracker
          </h2>
          <Card
            className="cursor-pointer hover:shadow-sm transition-shadow"
            onClick={() => navigate("/client/health-connect")}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Footprints className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Connect Health App</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Track your daily steps and activity
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      </div>
    </ClientLayout>
  );
}