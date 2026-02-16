import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Dumbbell, ListChecks, Target, Flame, UtensilsCrossed } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useClientFeatureSettings } from "@/hooks/useClientFeatureSettings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, parseISO, startOfWeek, endOfWeek, addDays } from "date-fns";
import { WorkoutDetailDialog } from "@/components/WorkoutDetailDialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ClientCoaching() {
  const navigate = useNavigate();
  const clientId = useEffectiveClientId();
  const { settings } = useClientFeatureSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Fetch workouts for the month
  const { data: workouts } = useQuery({
    queryKey: ["coaching-workouts", clientId, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_workouts")
        .select("*, workout_plans(id, name, category, duration_minutes, difficulty)")
        .eq("client_id", clientId)
        .gte("scheduled_date", format(monthStart, "yyyy-MM-dd"))
        .lte("scheduled_date", format(monthEnd, "yyyy-MM-dd"))
        .order("scheduled_date");
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Fetch tasks for the month
  const { data: tasks } = useQuery({
    queryKey: ["coaching-tasks", clientId, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_tasks")
        .select("*")
        .eq("client_id", clientId)
        .gte("due_date", format(monthStart, "yyyy-MM-dd"))
        .lte("due_date", format(monthEnd, "yyyy-MM-dd"))
        .order("due_date");
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Fetch habits
  const { data: habits } = useQuery({
    queryKey: ["coaching-habits", clientId, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_habits")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .lte("start_date", format(monthEnd, "yyyy-MM-dd"));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId,
  });

  // Fetch selected workout details
  const { data: selectedWorkout } = useQuery({
    queryKey: ["workout-detail", selectedWorkoutId],
    queryFn: async () => {
      if (!selectedWorkoutId) return null;
      const { data, error } = await supabase
        .from("client_workouts")
        .select("*, workout_plans(*, workout_plan_exercises(*, exercises(*)))")
        .eq("id", selectedWorkoutId)
        .single();
      if (error) throw error;
      return {
        ...data.workout_plans,
        workout_plan_exercises: data.workout_plans.workout_plan_exercises.map((wpe: any) => ({
          exercise: wpe.exercises,
          sets: wpe.sets, reps: wpe.reps,
          duration_seconds: wpe.duration_seconds, rest_seconds: wpe.rest_seconds,
          notes: wpe.notes, order_index: wpe.order_index,
        })),
      };
    },
    enabled: !!selectedWorkoutId,
  });

  const completeWorkoutMutation = useMutation({
    mutationFn: async () => {
      if (!selectedWorkoutId) return;
      const { error } = await supabase
        .from("client_workouts")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", selectedWorkoutId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-workouts"] });
      queryClient.invalidateQueries({ queryKey: ["workout-detail"] });
      toast({ title: "Success", description: "Workout marked as complete!" });
      setSelectedWorkoutId(null);
    },
  });

  // Helpers
  const getWorkoutsForDay = (day: Date) =>
    workouts?.filter((w) => w.scheduled_date && isSameDay(parseISO(w.scheduled_date), day)) || [];
  const getTasksForDay = (day: Date) =>
    tasks?.filter((t) => t.due_date && isSameDay(parseISO(t.due_date), day)) || [];
  const getHabitsForDay = (day: Date) => {
    if (!habits) return [];
    const dateStr = format(day, "yyyy-MM-dd");
    return habits.filter((h: any) => {
      if (h.start_date > dateStr) return false;
      if (h.end_date && h.end_date < dateStr) return false;
      if (h.frequency === "daily") return true;
      const startDay = new Date(h.start_date + "T00:00:00").getDay();
      return day.getDay() === startDay;
    });
  };

  const hasDots = (day: Date) => {
    return getWorkoutsForDay(day).length > 0 || getTasksForDay(day).length > 0 || getHabitsForDay(day).length > 0;
  };

  const dayWorkouts = getWorkoutsForDay(selectedDay);
  const dayTasks = getTasksForDay(selectedDay);
  const dayHabits = getHabitsForDay(selectedDay);
  const weekDays = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <ClientLayout>
      <div className="p-4 space-y-4 pb-24">
        <h1 className="text-2xl font-bold text-foreground">Coaching</h1>

        {/* Month Calendar */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-3">
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-foreground">{format(currentDate, "MMMM yyyy")}</span>
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {weekDays.map((d, i) => (
                <div key={i} className="text-center text-[11px] font-medium text-muted-foreground">{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());
                const isSelected = isSameDay(day, selectedDay);
                const dots = hasDots(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    className={`flex flex-col items-center justify-center h-10 rounded-full text-sm transition-colors ${
                      !isCurrentMonth ? "text-muted-foreground/40" : "text-foreground"
                    } ${isSelected ? "bg-primary text-primary-foreground" : ""} ${
                      isToday && !isSelected ? "ring-2 ring-primary" : ""
                    }`}
                  >
                    <span className="text-xs font-medium">{format(day, "d")}</span>
                    {dots && !isSelected && (
                      <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Detail */}
        <div>
          <h2 className="font-semibold text-foreground mb-2">
            {isSameDay(selectedDay, new Date()) ? "Today" : format(selectedDay, "EEEE, MMM d")}
          </h2>

          {dayWorkouts.length === 0 && dayTasks.length === 0 && dayHabits.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                No activities scheduled for this day
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {/* Workouts */}
            {dayWorkouts.map((workout) => {
              const isCompleted = !!workout.completed_at;
              return (
                <Card
                  key={workout.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setSelectedWorkoutId(workout.id)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                      isCompleted ? "bg-success/20 text-success" : "bg-primary/20 text-primary"
                    }`}>
                      {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Dumbbell className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{workout.workout_plans?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {workout.workout_plans?.duration_minutes}min · {workout.workout_plans?.category}
                      </p>
                    </div>
                    {isCompleted && <Badge variant="secondary" className="text-[10px] shrink-0">Done</Badge>}
                  </CardContent>
                </Card>
              );
            })}

            {/* Tasks */}
            {dayTasks.map((task) => {
              const isCompleted = !!task.completed_at;
              return (
                <Card key={task.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate("/client/tasks")}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                      isCompleted ? "bg-success/20 text-success" : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                    }`}>
                      {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <ListChecks className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{task.name}</p>
                      <p className="text-xs text-muted-foreground">Task</p>
                    </div>
                    {isCompleted && <Badge variant="secondary" className="text-[10px] shrink-0">Done</Badge>}
                  </CardContent>
                </Card>
              );
            })}

            {/* Habits */}
            {dayHabits.map((habit: any) => {
              const icon = habit.icon_url?.startsWith("emoji:") ? habit.icon_url.replace("emoji:", "") : "🎯";
              return (
                <Card key={habit.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate(`/client/habits/${habit.id}`)}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 text-lg">
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{habit.name}</p>
                      <p className="text-xs text-muted-foreground">{habit.goal_value} {habit.goal_unit} · {habit.frequency}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Macros This Week Card */}
        <MacrosThisWeekSection clientId={clientId} onNavigate={() => navigate("/client/nutrition")} />

        {/* Meal Options Section */}
        <MealOptionsSection clientId={clientId} onNavigate={() => navigate("/client/meal-plan")} />
      </div>

      {selectedWorkoutId && (
        <WorkoutDetailDialog
          open={!!selectedWorkoutId}
          onOpenChange={(open) => !open && setSelectedWorkoutId(null)}
          workout={selectedWorkout || null}
          isCompleted={!!workouts?.find((w) => w.id === selectedWorkoutId)?.completed_at}
          onMarkComplete={() => completeWorkoutMutation.mutate()}
          completingWorkout={completeWorkoutMutation.isPending}
        />
      )}
    </ClientLayout>
  );
}

function MealOptionsSection({ clientId, onNavigate }: { clientId: string; onNavigate: () => void }) {
  const { data: assignment } = useQuery({
    queryKey: ["client-meal-assignment", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_meal_plan_assignments")
        .select("*, meal_plans(*)")
        .eq("client_id", clientId)
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const mealPlan = assignment?.meal_plans;
  const isFlexible = mealPlan?.plan_type === "flexible";

  const { data: options } = useQuery({
    queryKey: ["coaching-meal-options", assignment?.meal_plan_id],
    queryFn: async () => {
      const table = isFlexible ? "meal_plan_flexible_options" : "meal_plan_days";
      const { data, error } = await supabase
        .from(table)
        .select("*, recipes(*)")
        .eq("meal_plan_id", assignment!.meal_plan_id!)
        .order("meal_type");
      if (error) throw error;
      return data;
    },
    enabled: !!assignment?.meal_plan_id,
  });

  if (!assignment || !options || options.length === 0) return null;

  const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
  const mealGroups = MEAL_TYPES.map((type) => {
    const items = options.filter((o: any) => o.meal_type === type);
    // Get first recipe image as thumbnail
    const firstRecipe = items[0]?.recipes;
    return { type, count: items.length, image: firstRecipe?.image_url, name: type };
  }).filter((g) => g.count > 0);

  // Weekly nutrition averages
  const allRecipes = options.map((o: any) => o.recipes).filter(Boolean);
  const avgCalories = allRecipes.length > 0 ? Math.round(allRecipes.reduce((s: number, r: any) => s + (r.calories || 0), 0) / Math.max(allRecipes.length / mealGroups.length, 1)) : 0;
  const avgProtein = allRecipes.length > 0 ? Math.round(allRecipes.reduce((s: number, r: any) => s + Number(r.protein || 0), 0) / Math.max(allRecipes.length / mealGroups.length, 1)) : 0;
  const avgCarbs = allRecipes.length > 0 ? Math.round(allRecipes.reduce((s: number, r: any) => s + Number(r.carbs || 0), 0) / Math.max(allRecipes.length / mealGroups.length, 1)) : 0;
  const avgFats = allRecipes.length > 0 ? Math.round(allRecipes.reduce((s: number, r: any) => s + Number(r.fats || 0), 0) / Math.max(allRecipes.length / mealGroups.length, 1)) : 0;

  return (
    <Card className="cursor-pointer" onClick={onNavigate}>
      <CardContent className="p-4">
        <h3 className="font-bold text-base mb-3">Meal Options</h3>

        {/* Weekly Nutrition Averages */}
        <div className="flex items-center gap-2 mb-3">
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="text-sm text-muted-foreground">Weekly Nutrition Averages</span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center mb-4">
          <div>
            <p className="font-bold text-lg">{avgCalories}<span className="text-xs font-normal text-muted-foreground ml-0.5">cal</span></p>
            <p className="text-[10px] text-muted-foreground">Calories</p>
          </div>
          <div>
            <p className="font-bold text-lg">{avgProtein}<span className="text-xs font-normal text-muted-foreground ml-0.5">g</span></p>
            <p className="text-[10px] text-muted-foreground">Protein</p>
          </div>
          <div>
            <p className="font-bold text-lg">{avgCarbs}<span className="text-xs font-normal text-muted-foreground ml-0.5">g</span></p>
            <p className="text-[10px] text-muted-foreground">Carbs</p>
          </div>
          <div>
            <p className="font-bold text-lg">{avgFats}<span className="text-xs font-normal text-muted-foreground ml-0.5">g</span></p>
            <p className="text-[10px] text-muted-foreground">Fat</p>
          </div>
        </div>

        {/* Meal category thumbnails */}
        <div className="grid grid-cols-4 gap-3">
          {mealGroups.map((group) => (
            <div key={group.type} className="text-center">
              <p className="text-xs font-medium capitalize mb-1.5 text-foreground">{group.type}</p>
              <div className="relative">
                {group.image ? (
                  <img src={group.image} alt={group.type} className="w-full aspect-square object-cover rounded-lg" />
                ) : (
                  <div className="w-full aspect-square bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center">
                    <UtensilsCrossed className="h-6 w-6 text-primary/40" />
                  </div>
                )}
                <Badge className="absolute -bottom-1 -right-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                  {group.count}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MacrosThisWeekSection({ clientId, onNavigate }: { clientId: string; onNavigate: () => void }) {
  const { settings } = useClientFeatureSettings();

  const { data: macroTargets } = useQuery({
    queryKey: ["client-macro-targets", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_macro_targets")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && settings.macros_enabled,
  });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDates = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), "yyyy-MM-dd"));

  const { data: weeklyNutrition } = useQuery({
    queryKey: ["nutrition-week", clientId, weekDates[0]],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrition_logs")
        .select("*")
        .eq("client_id", clientId)
        .gte("log_date", weekDates[0])
        .lte("log_date", weekDates[6]);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && settings.macros_enabled,
  });

  if (!settings.macros_enabled || !macroTargets) return null;

  const weeklyCaloriesByDay = weekDates.map((date, i) => {
    const dayLogs = weeklyNutrition?.filter((l) => l.log_date === date) || [];
    return {
      day: ["M", "T", "W", "T", "F", "S", "S"][i],
      calories: dayLogs.reduce((sum, l) => sum + (l.calories || 0), 0),
      isToday: date === format(new Date(), "yyyy-MM-dd"),
    };
  });
  const weeklyTotalCalories = weeklyCaloriesByDay.reduce((sum, d) => sum + d.calories, 0);
  const daysWithData = weeklyCaloriesByDay.filter((d) => d.calories > 0).length;
  const weeklyAvgCalories = daysWithData > 0 ? Math.round(weeklyTotalCalories / daysWithData) : 0;
  const dailyGoal = macroTargets?.target_calories || 0;
  const maxChartVal = Math.max(dailyGoal * 1.2, ...weeklyCaloriesByDay.map((d) => d.calories), 1);

  return (
    <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={onNavigate}>
      <CardContent className="p-5">
        <div className="flex items-baseline gap-2 mb-4">
          <h2 className="text-lg font-bold">Macros</h2>
          <span className="text-sm text-muted-foreground">(this week)</span>
        </div>

        {/* Mini calorie chart */}
        <div className="relative h-[120px] mb-3">
          {dailyGoal > 0 && (
            <div
              className="absolute left-0 right-0 flex items-center gap-1.5"
              style={{ bottom: `${(dailyGoal / maxChartVal) * 100}%` }}
            >
              <span className="text-[10px] font-semibold text-foreground shrink-0">
                {dailyGoal.toLocaleString()} ★
              </span>
              <div className="flex-1 border-t-2 border-foreground" />
            </div>
          )}

          <div className="flex items-end justify-between h-full gap-1 pt-4 pb-0">
            {weeklyCaloriesByDay.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <div
                  className="w-full max-w-[28px] rounded-t-sm transition-all"
                  style={{
                    height: d.calories > 0 ? `${Math.max((d.calories / maxChartVal) * 100, 4)}%` : "2px",
                    backgroundColor: d.isToday
                      ? "hsl(var(--primary))"
                      : d.calories > 0
                        ? "hsl(var(--primary) / 0.4)"
                        : "hsl(var(--muted))",
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Day labels */}
        <div className="flex justify-between px-0.5">
          {weeklyCaloriesByDay.map((d, i) => (
            <span
              key={i}
              className={`text-xs font-medium flex-1 text-center ${
                d.isToday ? "text-primary font-bold" : "text-muted-foreground"
              }`}
            >
              {d.day}
            </span>
          ))}
        </div>

        <p className="text-sm text-muted-foreground mt-3 text-center">
          Average weekly calories is {weeklyAvgCalories.toLocaleString()} Cal
        </p>
      </CardContent>
    </Card>
  );
}
