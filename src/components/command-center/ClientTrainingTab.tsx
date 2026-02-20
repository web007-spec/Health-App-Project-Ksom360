import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Plus, Eye, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, isToday } from "date-fns";
import { useState } from "react";
import { AssignWorkoutToClientDialog } from "@/components/command-center/AssignWorkoutToClientDialog";

interface Props {
  clientId: string;
  trainerId: string;
}

export function ClientTrainingTab({ clientId, trainerId }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekSpan, setWeekSpan] = useState<1 | 2>(2);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addWeeks(weekStart, weekSpan - 1), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: assignedWorkouts, refetch } = useQuery({
    queryKey: ["client-assigned-workouts", clientId, format(weekStart, "yyyy-MM-dd"), format(weekEnd, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_workouts")
        .select(`*, workout_plan:workout_plans(name, category, difficulty, duration_minutes)`)
        .eq("client_id", clientId)
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, weekSpan));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, weekSpan));
  const handleToday = () => setCurrentDate(new Date());

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setAssignDialogOpen(true);
  };

  const getWorkoutsForDay = (day: Date) => {
    if (!assignedWorkouts) return [];
    return assignedWorkouts.filter((w) =>
      w.scheduled_date && isSameDay(parseISO(w.scheduled_date), day)
    );
  };

  const unscheduledWorkouts = assignedWorkouts?.filter((w) => !w.scheduled_date) || [];

  const weekDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const dateRangeLabel = `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>TODAY</Button>
          <Button variant="ghost" size="icon" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[140px] text-center">{dateRangeLabel}</span>
          <Button variant="ghost" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border rounded-lg overflow-hidden">
            <Button variant={weekSpan === 1 ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setWeekSpan(1)}>1 Week</Button>
            <Button variant={weekSpan === 2 ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setWeekSpan(2)}>2 Week</Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate(`/clients/${clientId}/workout-history`)}>
            <Eye className="h-4 w-4 mr-1" /> History
          </Button>
          <Button size="sm" className="gap-1" onClick={() => { setSelectedDate(undefined); setAssignDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> Assign Workout
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {weekDays.map((day) => (
            <div key={day} className="text-xs font-semibold text-muted-foreground text-center py-2 border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 border-b last:border-b-0">
            {week.map((day) => {
              const dayWorkouts = getWorkoutsForDay(day);
              const today = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[110px] border-r last:border-r-0 p-2 relative group cursor-pointer hover:bg-muted/30 transition-colors ${today ? "bg-primary/5" : "bg-background"}`}
                  onClick={() => handleDayClick(day)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${today ? "bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center" : "text-foreground"}`}>
                      {format(day, "d")}
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground">
                      <Plus className="h-3.5 w-3.5" />
                    </span>
                  </div>

                  <div className="space-y-1">
                    {dayWorkouts.map((w: any) => {
                      const done = !!w.completed_at;
                      return (
                        <div
                          key={w.id}
                          onClick={(e) => e.stopPropagation()}
                          className={`text-xs p-1.5 rounded flex items-center gap-1.5 ${
                            done
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {done
                            ? <CheckCircle2 className="h-3 w-3 shrink-0" />
                            : <Dumbbell className="h-3 w-3 shrink-0" />}
                          <span className="truncate">{w.workout_plan?.name || "Workout"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Unscheduled Workouts */}
      {unscheduledWorkouts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Unscheduled Workouts</h3>
          <div className="space-y-2">
            {unscheduledWorkouts.map((w: any) => (
              <div key={w.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Dumbbell className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{w.workout_plan?.name || "Workout"}</p>
                    <p className="text-xs text-muted-foreground">
                      {[w.workout_plan?.difficulty, w.workout_plan?.duration_minutes ? `${w.workout_plan.duration_minutes} min` : null].filter(Boolean).join(" · ") || "No details"}
                    </p>
                  </div>
                </div>
                {w.completed_at
                  ? <Badge variant="outline" className="text-xs text-green-600">Done</Badge>
                  : <Badge variant="secondary" className="text-xs">Pending</Badge>
                }
              </div>
            ))}
          </div>
        </div>
      )}

      <AssignWorkoutToClientDialog
        clientId={clientId}
        trainerId={trainerId}
        open={assignDialogOpen}
        onOpenChange={(open) => {
          setAssignDialogOpen(open);
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ["client-assigned-workouts", clientId] });
          }
        }}
        initialDate={selectedDate}
      />
    </div>
  );
}
