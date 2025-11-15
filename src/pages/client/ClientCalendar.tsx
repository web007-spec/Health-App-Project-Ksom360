import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, startOfWeek, endOfWeek } from "date-fns";
import { WorkoutDetailDialog } from "@/components/WorkoutDetailDialog";
import { useToast } from "@/hooks/use-toast";

export default function ClientCalendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);

  // Fetch client workouts for the current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const { data: workouts, isLoading } = useQuery({
    queryKey: ["calendar-workouts", user?.id, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_workouts")
        .select(`
          *,
          workout_plans (
            id,
            name,
            category,
            duration_minutes,
            difficulty
          )
        `)
        .eq("client_id", user?.id)
        .gte("scheduled_date", format(monthStart, "yyyy-MM-dd"))
        .lte("scheduled_date", format(monthEnd, "yyyy-MM-dd"))
        .order("scheduled_date", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch selected workout details
  const { data: selectedWorkout } = useQuery({
    queryKey: ["workout-detail", selectedWorkoutId],
    queryFn: async () => {
      if (!selectedWorkoutId) return null;

      const { data, error } = await supabase
        .from("client_workouts")
        .select(`
          *,
          workout_plans (
            *,
            workout_plan_exercises (
              *,
              exercises (*)
            )
          )
        `)
        .eq("id", selectedWorkoutId)
        .single();

      if (error) throw error;

      // Transform to match WorkoutDetailDialog format
      return {
        ...data.workout_plans,
        workout_plan_exercises: data.workout_plans.workout_plan_exercises.map((wpe: any) => ({
          exercise: wpe.exercises,
          sets: wpe.sets,
          reps: wpe.reps,
          duration_seconds: wpe.duration_seconds,
          rest_seconds: wpe.rest_seconds,
          notes: wpe.notes,
          order_index: wpe.order_index,
        })),
      };
    },
    enabled: !!selectedWorkoutId,
  });

  // Mark workout as complete
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
      queryClient.invalidateQueries({ queryKey: ["calendar-workouts"] });
      queryClient.invalidateQueries({ queryKey: ["workout-detail"] });
      toast({
        title: "Success",
        description: "Workout marked as complete!",
      });
      setSelectedWorkoutId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete workout",
        variant: "destructive",
      });
    },
  });

  // Generate calendar days
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getWorkoutsForDay = (day: Date) => {
    if (!workouts) return [];
    return workouts.filter((w) => w.scheduled_date && isSameDay(parseISO(w.scheduled_date), day));
  };

  const handlePreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading calendar...</p>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Workout Calendar</h1>
            <p className="text-muted-foreground mt-1">View your scheduled workouts</p>
          </div>
          <Button variant="outline" onClick={handleToday}>
            <CalendarIcon className="h-4 w-4 mr-2" />
            Today
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{format(currentDate, "MMMM yyyy")}</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Week day headers */}
              {weekDays.map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendarDays.map((day) => {
                const dayWorkouts = getWorkoutsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-24 border rounded-lg p-2 ${
                      isCurrentMonth ? "bg-background" : "bg-muted/30"
                    } ${isToday ? "border-primary border-2" : "border-border"}`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isCurrentMonth ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {format(day, "d")}
                    </div>
                    
                    <div className="space-y-1">
                      {dayWorkouts.map((workout) => {
                        const isCompleted = !!workout.completed_at;
                        return (
                          <button
                            key={workout.id}
                            onClick={() => setSelectedWorkoutId(workout.id)}
                            className={`w-full text-left text-xs p-1.5 rounded transition-colors ${
                              isCompleted
                                ? "bg-success/20 hover:bg-success/30 text-success-foreground"
                                : "bg-primary/20 hover:bg-primary/30 text-primary-foreground"
                            }`}
                          >
                            <div className="font-medium truncate">
                              {workout.workout_plans?.name}
                            </div>
                            <div className="text-[10px] opacity-80">
                              {workout.workout_plans?.duration_minutes}min
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-primary/20"></div>
                <span className="text-sm text-muted-foreground">Scheduled</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-success/20"></div>
                <span className="text-sm text-muted-foreground">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-primary"></div>
                <span className="text-sm text-muted-foreground">Today</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Workouts List */}
        {workouts && workouts.filter(w => !w.completed_at).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Workouts This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workouts
                  .filter((w) => !w.completed_at)
                  .slice(0, 5)
                  .map((workout) => (
                    <button
                      key={workout.id}
                      onClick={() => setSelectedWorkoutId(workout.id)}
                      className="w-full p-4 border rounded-lg hover:bg-accent transition-colors text-left"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{workout.workout_plans?.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {workout.scheduled_date && format(parseISO(workout.scheduled_date), "EEEE, MMMM d")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{workout.workout_plans?.category}</Badge>
                          <Badge variant="secondary">{workout.workout_plans?.duration_minutes}min</Badge>
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
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
