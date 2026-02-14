import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Plus, ChevronLeft, ChevronRight, Clock, FileText, Camera, Activity, ClipboardList, Target } from "lucide-react";
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, isToday, addDays } from "date-fns";
import { useState } from "react";
import { AssignTaskDialog } from "@/components/AssignTaskDialog";
import { CreateClientTaskDialog } from "@/components/command-center/CreateClientTaskDialog";

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
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekSpan, setWeekSpan] = useState<1 | 2>(2);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addWeeks(weekStart, weekSpan - 1), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: tasks } = useQuery({
    queryKey: ["client-tasks-all", clientId, format(weekStart, "yyyy-MM-dd"), format(weekEnd, "yyyy-MM-dd")],
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
  });

  // Also fetch tasks without due dates (unscheduled)
  const { data: unscheduledTasks } = useQuery({
    queryKey: ["client-tasks-unscheduled", clientId],
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
  });

  const getTasksForDay = (day: Date) => {
    if (!tasks) return [];
    return tasks.filter((t) => t.due_date && isSameDay(parseISO(t.due_date), day));
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
          <Button variant="outline" size="sm" onClick={handleToday}>
            TODAY
          </Button>
          <Button variant="ghost" size="icon" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[140px] text-center">{dateRangeLabel}</span>
          <Button variant="ghost" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1 border rounded-lg overflow-hidden">
          <Button
            variant={weekSpan === 1 ? "default" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setWeekSpan(1)}
          >
            1 Week
          </Button>
          <Button
            variant={weekSpan === 2 ? "default" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setWeekSpan(2)}
          >
            2 Week
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {weekDays.map((day) => (
            <div key={day} className="text-xs font-semibold text-muted-foreground text-center py-2 border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Week rows */}
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 border-b last:border-b-0">
            {week.map((day) => {
              const dayTasks = getTasksForDay(day);
              const today = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[120px] border-r last:border-r-0 p-2 relative group ${
                    today ? "bg-primary/5" : "bg-background"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-sm font-medium ${
                        today
                          ? "bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center"
                          : "text-foreground"
                      }`}
                    >
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
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

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
                    {task.completed_at ? (
                      <CheckSquare className="h-4 w-4 text-green-500" />
                    ) : (
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div>
                      <p className={`text-sm font-medium ${task.completed_at ? "line-through" : ""}`}>
                        {task.name}
                      </p>
                    </div>
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
      />

      <AssignTaskDialog
        clientId={clientId}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
      />
    </div>
  );
}