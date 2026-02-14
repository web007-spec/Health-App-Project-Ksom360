import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Plus, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { AssignTaskDialog } from "@/components/AssignTaskDialog";

interface Props {
  clientId: string;
  trainerId: string;
}

export function ClientTasksTab({ clientId, trainerId }: Props) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const { data: tasks } = useQuery({
    queryKey: ["client-tasks-all", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_tasks")
        .select("*")
        .eq("client_id", clientId)
        .eq("trainer_id", trainerId)
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const pendingTasks = tasks?.filter(t => !t.completed_at) || [];
  const completedTasks = tasks?.filter(t => t.completed_at) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <Button size="sm" className="gap-1" onClick={() => setAssignDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Assign Task
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending ({pendingTasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingTasks.length > 0 ? (
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{task.name}</p>
                      {task.due_date && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due {format(new Date(task.due_date), "MMM dd")}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">{task.task_type}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No pending tasks</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Completed ({completedTasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {completedTasks.length > 0 ? (
            <div className="space-y-3">
              {completedTasks.slice(0, 10).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 opacity-70">
                  <div className="flex items-center gap-3">
                    <CheckSquare className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-sm font-medium line-through">{task.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Completed {formatDistanceToNow(new Date(task.completed_at!), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No completed tasks</p>
          )}
        </CardContent>
      </Card>

      <AssignTaskDialog
        clientId={clientId}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
      />
    </div>
  );
}
