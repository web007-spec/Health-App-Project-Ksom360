import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Plus, ChevronLeft, ChevronRight, FileText, Camera, Activity, ClipboardList, Target, MoreHorizontal, Save, StopCircle, Trash2, BarChart3 } from "lucide-react";
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, isToday, isWithinInterval } from "date-fns";
import { useState } from "react";
import { AssignTaskDialog } from "@/components/AssignTaskDialog";
import { CreateClientTaskDialog } from "@/components/command-center/CreateClientTaskDialog";
import { CreateHabitDialog } from "@/components/command-center/CreateHabitDialog";
import { HabitInsightDialog } from "@/components/command-center/HabitInsightDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  clientId: string;
  trainerId: string;
}

const taskTypeIcons: Record<string, any> = {
  general: FileText,
  progress_photo: Camera,
  body_metrics: Activity,
  form: ClipboardList,
  habit: Target,
};

export function ClientTasksTab({ clientId, trainerId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [habitDialogOpen, setHabitDialogOpen] = useState(false);
  const [insightHabit, setInsightHabit] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekSpan, setWeekSpan] = useState<1 | 2>(2);
  const [deleteHabitId, setDeleteHabitId] = useState<string | null>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addWeeks(weekStart, weekSpan - 1), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: tasks } = useQuery({
    queryKey: ["client-tasks-all", clientId, trainerId, format(weekStart, "yyyy-MM-dd"), format(weekEnd, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_tasks")
        .select("*")
        .eq("client_id", clientId)
        .eq("trainer_id", trainerId)
        .gte("due_date", format(weekStart, "yyyy-MM-dd"))
        .lte("due_date", format(weekEnd, "yyyy-MM-dd"))
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!trainerId && !!clientId,
  });

  const { data: habits } = useQuery({
    queryKey: ["client-habits", clientId, trainerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_habits" as any)
        .select("*")
        .eq("client_id", clientId)
        .eq("trainer_id", trainerId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!trainerId && !!clientId,
  });

  const { data: habitCompletions } = useQuery({
    queryKey: ["habit-completions-range", clientId, format(weekStart, "yyyy-MM-dd"), format(weekEnd, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habit_completions" as any)
        .select("*")
        .eq("client_id", clientId)
        .gte("completion_date", format(weekStart, "yyyy-MM-dd"))
        .lte("completion_date", format(weekEnd, "yyyy-MM-dd"));
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: unscheduledTasks } = useQuery({
    queryKey: ["client-tasks-unscheduled", clientId, trainerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_tasks")
        .select("*")
        .eq("client_id", clientId)
        .eq("trainer_id", trainerId)
        .is("due_date", null)
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!trainerId && !!clientId,
  });

  const endHabitMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const { error } = await supabase
        .from("client_habits" as any)
        .update({ is_active: false, end_date: format(new Date(), "yyyy-MM-dd") })
        .eq("id", habitId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-habits"] });
      toast({ title: "Habit ended", description: "All future occurrences have been removed." });
    },
  });

  const deleteHabitMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const { error } = await supabase
        .from("client_habits" as any)
        .delete()
        .eq("id", habitId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-habits"] });
      queryClient.invalidateQueries({ queryKey: ["habit-completions-range"] });
      toast({ title: "Habit deleted", description: "Habit and all completions have been permanently removed." });
      setDeleteHabitId(null);
    },
  });

  const saveHabitToLibraryMutation = useMutation({
    mutationFn: async (habit: any) => {
      const { error } = await supabase.from("task_templates").insert([{
        trainer_id: user?.id,
        name: habit.name,
        task_type: "habit" as any,
        description: habit.description,
        icon_url: habit.icon_url,
        goal_value: habit.goal_value,
        goal_unit: habit.goal_unit,
        frequency: habit.frequency,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-templates"] });
      toast({ title: "Saved to library", description: "Habit template saved for reuse." });
    },
  });

  const getTasksForDay = (day: Date) => {
    if (!tasks) return [];
    return tasks.filter((t) => t.due_date && isSameDay(parseISO(t.due_date), day));
  };

  const getHabitsForDay = (day: Date) => {
    if (!habits) return [];
    return habits.filter((h: any) => {
      const start = parseISO(h.start_date);
      const end = h.end_date ? parseISO(h.end_date) : new Date(2099, 0, 1);
      if (!isWithinInterval(day, { start, end })) return false;
      if (h.frequency === "daily") return true;
      // Weekly: show on the start day's weekday
      return day.getDay() === start.getDay();
    });
  };

  const isHabitCompletedOnDay = (habitId: string, day: Date) => {
    if (!habitCompletions) return false;
    const dateStr = format(day, "yyyy-MM-dd");
    return habitCompletions.some((c: any) => c.habit_id === habitId && c.completion_date === dateStr);
  };

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, weekSpan));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, weekSpan));
  const handleToday = () => setCurrentDate(new Date());

  const handleAddTask = (day: Date) => {
    setSelectedDate(day);
    setCreateDialogOpen(true);
  };

  const weekDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const dateRangeLabel = `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`;

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
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
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {weekDays.map((day) => (
            <div key={day} className="text-xs font-semibold text-muted-foreground text-center py-2 border-r last:border-r-0">{day}</div>
          ))}
        </div>

        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 border-b last:border-b-0">
            {week.map((day) => {
              const dayTasks = getTasksForDay(day);
              const dayHabits = getHabitsForDay(day);
              const today = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[120px] border-r last:border-r-0 p-2 relative group ${today ? "bg-primary/5" : "bg-background"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${today ? "bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center" : "text-foreground"}`}>
                      {format(day, "dd")}
                    </span>
                    <button
                      onClick={() => handleAddTask(day)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center"
                    >
                      <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    {dayTasks.map((task) => {
                      const Icon = taskTypeIcons[task.task_type] || FileText;
                      const isCompleted = !!task.completed_at;
                      return (
                        <div
                          key={task.id}
                          className={`text-xs p-1.5 rounded flex items-center gap-1.5 ${
                            isCompleted
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 line-through"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          <Icon className="h-3 w-3 shrink-0" />
                          <span className="truncate">{task.name}</span>
                        </div>
                      );
                    })}
                    {dayHabits.map((habit: any) => {
                      const completed = isHabitCompletedOnDay(habit.id, day);
                      const icon = habit.icon_url?.startsWith("emoji:") ? habit.icon_url.replace("emoji:", "") : "🎯";
                      return (
                        <div
                          key={`habit-${habit.id}`}
                          className={`text-xs p-1.5 rounded flex items-center gap-1.5 ${
                            completed
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                          }`}
                        >
                          <span className="text-[10px]">{icon}</span>
                          <span className="truncate">{habit.name}</span>
                          {completed && <CheckSquare className="h-2.5 w-2.5 shrink-0 ml-auto" />}
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

      {/* Active Habits Section */}
      {habits && habits.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Active Habits</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {habits.map((habit: any) => {
              const icon = habit.icon_url?.startsWith("emoji:") ? habit.icon_url.replace("emoji:", "") : "🎯";
              return (
                <div key={habit.id} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{icon}</span>
                    <div>
                      <p className="text-sm font-medium">{habit.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {habit.goal_value} {habit.goal_unit} per {habit.frequency === "daily" ? "day" : "week"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setInsightHabit(habit)}>
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => saveHabitToLibraryMutation.mutate(habit)}>
                          <Save className="mr-2 h-4 w-4" />Save to Library
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => endHabitMutation.mutate(habit.id)}>
                          <StopCircle className="mr-2 h-4 w-4" />End Habit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteHabitId(habit.id)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />Delete Habit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unscheduled tasks */}
      {unscheduledTasks && unscheduledTasks.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Unscheduled Tasks</h3>
          <div className="space-y-2">
            {unscheduledTasks.map((task) => {
              const Icon = taskTypeIcons[task.task_type] || FileText;
              return (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {task.completed_at ? <CheckSquare className="h-4 w-4 text-green-500" /> : <Icon className="h-4 w-4 text-muted-foreground" />}
                    <p className={`text-sm font-medium ${task.completed_at ? "line-through" : ""}`}>{task.name}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">{task.task_type}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <CreateClientTaskDialog
        clientId={clientId}
        initialDate={selectedDate}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onChooseFromLibrary={() => setAssignDialogOpen(true)}
        onCreateHabit={() => {
          setCreateDialogOpen(false);
          setHabitDialogOpen(true);
        }}
      />

      <AssignTaskDialog clientId={clientId} open={assignDialogOpen} onOpenChange={setAssignDialogOpen} />

      <CreateHabitDialog
        clientId={clientId}
        initialDate={selectedDate}
        open={habitDialogOpen}
        onOpenChange={setHabitDialogOpen}
      />

      <HabitInsightDialog
        habit={insightHabit}
        open={!!insightHabit}
        onOpenChange={(open) => !open && setInsightHabit(null)}
      />

      <AlertDialog open={!!deleteHabitId} onOpenChange={(open) => !open && setDeleteHabitId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Habit</AlertDialogTitle>
            <AlertDialogDescription>
              All occurrences of this habit (past and future) and insights will be permanently lost. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteHabitId && deleteHabitMutation.mutate(deleteHabitId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
