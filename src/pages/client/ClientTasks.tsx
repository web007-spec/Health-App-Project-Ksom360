import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Circle, FileText, Camera, Activity, ClipboardList, Target, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, isPast, parseISO, isWithinInterval } from "date-fns";

const taskTypeIcons = {
  general: FileText,
  progress_photo: Camera,
  body_metrics: Activity,
  form: ClipboardList,
  habit: Target,
};

const taskTypeLabels = {
  general: "General",
  progress_photo: "Progress Photo",
  body_metrics: "Body Metrics",
  form: "Form",
  habit: "Habit",
};

export default function ClientTasks() {
  const { user } = useAuth();
  const clientId = useEffectiveClientId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["client-tasks", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_tasks")
        .select("*")
        .eq("client_id", clientId)
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: habits } = useQuery({
    queryKey: ["client-habits-active", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_habits")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId,
  });

  const { data: todayCompletions } = useQuery({
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
    enabled: !!clientId,
  });

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
      queryClient.invalidateQueries({ queryKey: ["client-tasks"] });
      toast({ title: "Task completed!", description: "Great job on completing this task!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

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
      toast({ title: "Habit updated!" });
    },
  });

  const pendingTasks = tasks?.filter((task) => !task.completed_at) || [];
  const completedTasks = tasks?.filter((task) => task.completed_at) || [];

  // Filter habits that are due today
  const todaysHabits = habits?.filter((h: any) => {
    const today = new Date();
    const start = new Date(h.start_date + "T00:00:00");
    const end = h.end_date ? new Date(h.end_date + "T23:59:59") : new Date(2099, 0, 1);
    if (!isWithinInterval(today, { start, end })) return false;
    if (h.frequency === "daily") return true;
    return today.getDay() === start.getDay();
  }) || [];

  const TaskCard = ({ task }: { task: any }) => {
    const Icon = taskTypeIcons[task.task_type as keyof typeof taskTypeIcons];
    const isCompleted = !!task.completed_at;
    const isOverdue = task.due_date && !isCompleted && isPast(parseISO(task.due_date));

    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className={`p-2 rounded-lg ${isCompleted ? "bg-muted" : "bg-primary/10"}`}>
                <Icon className={`h-5 w-5 ${isCompleted ? "text-muted-foreground" : "text-primary"}`} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">{task.name}</CardTitle>
                <CardDescription className="mt-1">
                  {taskTypeLabels[task.task_type as keyof typeof taskTypeLabels]}
                </CardDescription>
              </div>
            </div>
            {!isCompleted && (
              <Button size="sm" onClick={() => completeMutation.mutate(task.id)} disabled={completeMutation.isPending}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Complete
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {task.description && <p className="text-sm text-muted-foreground mb-4">{task.description}</p>}
          <div className="flex flex-wrap gap-2">
            {isCompleted && (
              <Badge variant="secondary"><CheckCircle2 className="mr-1 h-3 w-3" />Completed</Badge>
            )}
            {task.due_date && (
              <Badge variant={isOverdue ? "destructive" : "outline"}>
                <Calendar className="mr-1 h-3 w-3" />
                {isOverdue ? "Overdue: " : "Due: "}{format(parseISO(task.due_date), "MMM d, yyyy")}
              </Badge>
            )}
            {task.reminder_enabled && !isCompleted && <Badge variant="outline">Reminder set</Badge>}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Tasks</h1>
          <p className="text-muted-foreground mt-1">Complete tasks assigned by your trainer</p>
        </div>

        {/* Today's Habits */}
        {todaysHabits.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Today's Habits</h2>
            <div className="grid gap-3">
              {todaysHabits.map((habit: any) => {
                const isCompleted = todayCompletions?.some((c: any) => c.habit_id === habit.id);
                const icon = habit.icon_url?.startsWith("emoji:") ? habit.icon_url.replace("emoji:", "") : "🎯";
                return (
                  <Card
                    key={habit.id}
                    className={`cursor-pointer transition-colors ${isCompleted ? "bg-primary/5 border-primary/20" : ""}`}
                    onClick={() => toggleHabitMutation.mutate({ habitId: habit.id, completed: !!isCompleted })}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      {isCompleted ? (
                        <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-2xl">{icon}</span>
                      <div className="flex-1">
                        <p className={`font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`}>{habit.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {habit.goal_value} {habit.goal_unit} per {habit.frequency === "daily" ? "day" : "week"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pendingTasks.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12"><p className="text-muted-foreground">Loading tasks...</p></div>
            ) : pendingTasks.length > 0 ? (
              pendingTasks.map((task) => <TaskCard key={task.id} task={task} />)
            ) : (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Circle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No pending tasks</p>
                <p className="text-sm text-muted-foreground mt-1">Your trainer will assign tasks to help you reach your goals</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedTasks.length > 0 ? (
              completedTasks.map((task) => <TaskCard key={task.id} task={task} />)
            ) : (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No completed tasks yet</p>
                <p className="text-sm text-muted-foreground mt-1">Complete tasks to track your progress</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ClientLayout>
  );
}
