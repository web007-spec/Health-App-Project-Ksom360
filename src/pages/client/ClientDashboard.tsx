import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Dumbbell, CheckCircle2, Circle, UtensilsCrossed, Footprints, ChevronRight, Smartphone, X, Plus, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format, isToday, parseISO } from "date-fns";
import { useState, useRef, useEffect, useCallback } from "react";
import { useClientFeatureSettings } from "@/hooks/useClientFeatureSettings";
import { LogMealDialog } from "@/components/LogMealDialog";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function ClientDashboard() {
  const { user } = useAuth();
  const clientId = useEffectiveClientId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { settings } = useClientFeatureSettings();

  // Carousel state
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Install banner state
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const [showInstallBanner, setShowInstallBanner] = useState(() => {
    if (isStandalone) return false;
    const dismissed = localStorage.getItem('installBannerDismissed');
    if (dismissed) {
      const days3 = 3 * 24 * 60 * 60 * 1000;
      if (Date.now() - parseInt(dismissed, 10) < days3) return false;
    }
    return true;
  });
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('installBannerDismissed', Date.now().toString());
  };

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIndex(index);
  }, []);

  // Check if profile is complete, redirect to onboarding if not
  const { data: profile } = useQuery({
    queryKey: ["profile-check", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", clientId)
        .single();

      if (!data?.full_name || data.full_name.trim() === '') {
        navigate("/client/onboarding");
      }
      
      return data;
    },
    enabled: !!clientId,
  });

  // Fetch today's workouts
  const { data: clientWorkouts } = useQuery({
    queryKey: ["client-workouts-today", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_workouts")
        .select(`*, workout_plan:workout_plans(*)`)
        .eq("client_id", clientId)
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && settings.training_enabled,
  });

  // Fetch today's tasks
  const { data: tasks } = useQuery({
    queryKey: ["client-tasks-today", clientId],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("client_tasks")
        .select("*")
        .eq("client_id", clientId)
        .or(`due_date.eq.${today},due_date.is.null`)
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && settings.tasks_enabled,
  });

  // Fetch today's habits
  const { data: habits } = useQuery({
    queryKey: ["client-habits-today", clientId],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("client_habits")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .lte("start_date", today);
      if (error) throw error;
      return (data as any[]).filter((h: any) => {
        if (h.end_date && h.end_date < today) return false;
        if (h.frequency === "daily") return true;
        const startDay = new Date(h.start_date + "T00:00:00").getDay();
        return new Date().getDay() === startDay;
      });
    },
    enabled: !!clientId && settings.tasks_enabled,
  });

  // Fetch today's habit completions
  const { data: habitCompletions } = useQuery({
    queryKey: ["client-habit-completions-today", clientId],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("habit_completions")
        .select("*")
        .eq("client_id", clientId)
        .eq("completion_date", today);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId && settings.tasks_enabled,
  });

  // Toggle habit completion
  const toggleHabitMutation = useMutation({
    mutationFn: async ({ habitId, completed }: { habitId: string; completed: boolean }) => {
      const today = format(new Date(), "yyyy-MM-dd");
      if (completed) {
        const { error } = await supabase
          .from("habit_completions")
          .delete()
          .eq("habit_id", habitId)
          .eq("client_id", clientId)
          .eq("completion_date", today);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("habit_completions")
          .insert({ habit_id: habitId, client_id: clientId!, completion_date: today });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-habit-completions-today"] });
    },
  });

  // Fetch nutrition logs for today
  const { data: todayNutrition } = useQuery({
    queryKey: ["nutrition-today", clientId],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("nutrition_logs")
        .select("*")
        .eq("client_id", clientId)
        .eq("log_date", today);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && settings.food_journal_enabled,
  });

  // Fetch macro targets
  const { data: macroTargets } = useQuery({
    queryKey: ["client-macro-targets", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_macro_targets")
        .select("*")
        .eq("client_id", clientId!)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && settings.macros_enabled,
  });

  const [logMealOpen, setLogMealOpen] = useState(false);

  // Complete task mutation
  const completeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("client_tasks")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", taskId)
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-tasks-today"] });
    },
  });

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const todayDate = format(new Date(), "EEEE, MMM d").toUpperCase();

  // Fetch custom rest day card
  const { data: restDayCard } = useQuery({
    queryKey: ["rest-day-card", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_rest_day_cards" as any)
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!clientId && settings.training_enabled,
  });

  // Today's workouts
  const todaysWorkouts = clientWorkouts?.filter((w) => {
    if (w.completed_at) return false;
    if (w.scheduled_date && isToday(parseISO(w.scheduled_date))) return true;
    return false;
  }) || [];

  const isRestDay = todaysWorkouts.length === 0;
  const hasMultiple = todaysWorkouts.length > 1;

  // Attach scroll listener
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !hasMultiple) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll, hasMultiple]);

  // Task stats
  const completedTaskCount = tasks?.filter((t) => t.completed_at)?.length || 0;
  const totalTaskCount = tasks?.length || 0;

  // Nutrition stats
  const todayMealCount = todayNutrition?.length || 0;
  const todayCalories = todayNutrition?.reduce((sum, log) => sum + (log.calories || 0), 0) || 0;

  return (
    <ClientLayout>
      <div className="p-4 pb-8 space-y-5 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="text-xs font-semibold text-muted-foreground tracking-wider">{todayDate}</p>
            <h1 className="text-2xl font-bold mt-0.5">Hello, {firstName}! 👋</h1>
            <p className="text-sm text-muted-foreground font-medium mt-0.5">Let's do this</p>
          </div>
          <Button variant="ghost" size="icon" className="relative" onClick={() => navigate("/client/settings")}>
            <Bell className="h-5 w-5" />
          </Button>
        </div>

        {/* Install App Banner */}
        {showInstallBanner && (
          <Card className="border-primary/30 bg-primary/5 overflow-hidden">
            <CardContent className="p-4 relative">
              <button onClick={dismissInstallBanner} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl shrink-0">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <div className="pr-4">
                  <p className="font-bold text-sm">📲 Install the app to get notifications</p>
                  {isIOS ? (
                    <div className="mt-1.5 space-y-1">
                      <p className="text-xs text-muted-foreground leading-relaxed">Get workout reminders on your lock screen:</p>
                      <ol className="text-xs text-muted-foreground list-decimal pl-4 space-y-0.5 leading-relaxed">
                        <li>Tap the <span className="font-semibold text-foreground">Share</span> button <span className="inline-block">⬆️</span> in Safari</li>
                        <li>Scroll down and tap <span className="font-semibold text-foreground">"Add to Home Screen"</span></li>
                        <li>Open the app from your home screen</li>
                        <li>Enable notifications in Settings</li>
                      </ol>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Add to your home screen for workout reminders, quick access, and offline use.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Workouts - only if training enabled */}
        {settings.training_enabled && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Today's Workout{hasMultiple ? "s" : ""}
            </h2>
            {isRestDay ? (
              <Card className="overflow-hidden">
                {restDayCard?.image_url ? (
                  <div className="relative h-44">
                    <img src={restDayCard.image_url} alt="Rest day" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Rest Day</p>
                      <p className="text-base font-bold text-white">
                        {restDayCard?.message || "No workouts scheduled for today. Enjoy your rest!"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <CardContent className="p-6 text-center">
                    <Dumbbell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-lg font-semibold">Rest Day</p>
                    <p className="text-sm text-muted-foreground">
                      {restDayCard?.message || "No workouts scheduled for today. Enjoy your rest!"}
                    </p>
                  </CardContent>
                )}
              </Card>
            ) : (
              <div>
                <div ref={scrollRef} className={hasMultiple ? "flex overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide" : ""}>
                  {todaysWorkouts.map((workout) => (
                    <Card
                      key={workout.id}
                      className={`overflow-hidden cursor-pointer hover:shadow-md transition-all duration-300 shrink-0 snap-center ${hasMultiple ? "w-full min-w-full" : "w-full"}`}
                      onClick={() => navigate(`/client/workouts/${workout.workout_plan_id}`)}
                    >
                      <div className="relative h-44 bg-gradient-to-br from-primary/20 to-primary/5">
                        {workout.workout_plan?.image_url ? (
                          <img src={workout.workout_plan.image_url} alt={workout.workout_plan.name} className="w-full h-full object-cover" />
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
                        <Button className="w-full" size="lg" variant="outline" onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/client/workouts/${workout.workout_plan_id}`);
                        }}>
                          View Workout
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {hasMultiple && (
                  <div className="flex justify-center gap-1.5 mt-3">
                    {todaysWorkouts.map((_, i) => (
                      <button
                        key={i}
                        className={`h-2 rounded-full transition-all duration-300 ${i === activeIndex ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"}`}
                        onClick={() => {
                          scrollRef.current?.scrollTo({ left: i * (scrollRef.current?.clientWidth || 0), behavior: "smooth" });
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tasks - only if tasks enabled */}
        {settings.tasks_enabled && tasks && tasks.length > 0 && (
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
                      onClick={() => { if (!isCompleted) completeMutation.mutate(task.id); }}
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
              <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => navigate("/client/tasks")}>
                View all tasks
              </Button>
            )}
          </div>
        )}

        {/* Habits - only if tasks enabled */}
        {settings.tasks_enabled && habits && habits.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold">Habits</h2>
              <button onClick={() => navigate("/client/habits")} className="text-sm font-semibold text-primary">View all</button>
            </div>
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {habits.map((habit: any) => {
                  const todayCompletionCount = habitCompletions?.filter((c: any) => c.habit_id === habit.id).length || 0;
                  const icon = habit.icon_url?.startsWith("emoji:") ? habit.icon_url.replace("emoji:", "") : "🎯";
                  return (
                    <div
                      key={habit.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/client/habits/${habit.id}`)}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg shrink-0">
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{habit.name}</span>
                        <p className="text-xs text-muted-foreground">{todayCompletionCount} of {habit.goal_value} {habit.goal_unit} today</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Nutrition / Macros Section */}
        {settings.macros_enabled && !macroTargets && (
          <div>
            <Card className="overflow-hidden cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate("/client/macro-setup")}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-base">Set Macro Goals</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Macros First, Magic Later.{"\n"}Let's Lock in That Goal Today!
                    </p>
                    <button className="text-sm font-semibold text-primary mt-2">Set goals</button>
                  </div>
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-3xl">
                    🍱
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {settings.macros_enabled && macroTargets && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nutrition</h2>
              <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-xs" onClick={() => navigate("/client/macro-setup")}>
                <Pencil className="h-3 w-3" /> Edit
              </Button>
            </div>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Mini donut chart */}
                  <div className="relative w-20 h-20 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { value: todayCalories, color: "hsl(var(--primary))" },
                            { value: Math.max((macroTargets.target_calories || 0) - todayCalories, 0), color: "hsl(var(--muted))" },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={28}
                          outerRadius={38}
                          startAngle={90}
                          endAngle={-270}
                          paddingAngle={0}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          <Cell fill="hsl(var(--primary))" />
                          <Cell fill="hsl(var(--muted))" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs font-bold text-foreground leading-none">{todayCalories}</span>
                      <span className="text-[9px] text-muted-foreground">cal</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">
                      {todayCalories} / {macroTargets.target_calories?.toLocaleString()} cal
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {todayMealCount > 0
                        ? `${todayMealCount} meal${todayMealCount > 1 ? "s" : ""} logged today`
                        : "No meals logged yet"}
                    </p>
                  </div>
                  <Button size="sm" className="shrink-0 gap-1" onClick={(e) => { e.stopPropagation(); setLogMealOpen(true); }}>
                    <Plus className="h-3.5 w-3.5" /> Log Meal
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Food Journal fallback (no macros but food journal enabled) */}
        {settings.food_journal_enabled && !settings.macros_enabled && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Food Journal</h2>
            <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate("/client/nutrition")}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-accent/10 rounded-xl">
                  <UtensilsCrossed className="h-6 w-6 text-accent" />
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
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate("/client/nutrition"); }}>
                  Add meal
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step Tracker / Health - only if activity logging enabled */}
        {settings.activity_logging_enabled && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Step Tracker</h2>
            <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate("/client/health-connect")}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Footprints className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Connect Health App</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Track your daily steps and activity</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <LogMealDialog open={logMealOpen} onOpenChange={setLogMealOpen} />
    </ClientLayout>
  );
}
