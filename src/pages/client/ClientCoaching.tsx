import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Dumbbell, ListChecks, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useClientFeatureSettings } from "@/hooks/useClientFeatureSettings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, parseISO, startOfWeek, endOfWeek } from "date-fns";
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

        {/* Meal plan shortcut */}
        {settings.food_journal_enabled !== false && (
          <Card className="cursor-pointer" onClick={() => navigate("/client/meal-plan")}>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-foreground">🍽️ View your meal plan →</p>
            </CardContent>
          </Card>
        )}
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
