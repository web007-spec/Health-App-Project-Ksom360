import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Plus, Eye, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { AssignWorkoutToClientDialog } from "@/components/command-center/AssignWorkoutToClientDialog";

interface Props {
  clientId: string;
  trainerId: string;
}

export function ClientTrainingTab({ clientId, trainerId }: Props) {
  const navigate = useNavigate();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const { data: assignedWorkouts } = useQuery({
    queryKey: ["client-assigned-workouts", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_workouts")
        .select(`*, workout_plan:workout_plans(name, category, difficulty, duration_minutes)`)
        .eq("client_id", clientId)
        .order("scheduled_date", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const { data: sessions } = useQuery({
    queryKey: ["client-sessions-recent", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("*, workout_plan:workout_plans(name)")
        .eq("client_id", clientId)
        .order("started_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const upcomingWorkouts = assignedWorkouts?.filter(w => !w.completed_at) || [];
  const completedWorkouts = assignedWorkouts?.filter(w => w.completed_at) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Training</h2>
        <div className="flex gap-2">
          <Button size="sm" className="gap-1" onClick={() => setAssignDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Assign Workout
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/clients/${clientId}/workout-history`)}>
            <Eye className="h-4 w-4 mr-1" /> Full History
          </Button>
        </div>
      </div>

      {/* Upcoming */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming ({upcomingWorkouts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingWorkouts.length > 0 ? (
            <div className="space-y-3">
              {upcomingWorkouts.map((aw: any) => (
                <div key={aw.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Dumbbell className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{aw.workout_plan?.name || "Workout"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {aw.scheduled_date ? format(new Date(aw.scheduled_date), "MMM dd, yyyy") : "No date"}
                        {aw.workout_plan?.difficulty && ` · ${aw.workout_plan.difficulty}`}
                        {aw.workout_plan?.duration_minutes && ` · ${aw.workout_plan.duration_minutes} min`}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">Pending</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No upcoming workouts</p>
          )}
        </CardContent>
      </Card>

      {/* Completed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Completed ({completedWorkouts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {completedWorkouts.length > 0 ? (
            <div className="space-y-3">
              {completedWorkouts.slice(0, 10).map((aw: any) => (
                <div key={aw.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 opacity-80">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Dumbbell className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{aw.workout_plan?.name || "Workout"}</p>
                      <p className="text-xs text-muted-foreground">
                        Completed {formatDistanceToNow(new Date(aw.completed_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">Done</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No completed workouts</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      {sessions && sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sessions.map((session: any) => (
                <div key={session.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{session.workout_plan?.name || "Session"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}
                      {session.duration_seconds && ` · ${Math.round(session.duration_seconds / 60)} min`}
                    </p>
                  </div>
                  {session.difficulty_rating && (
                    <Badge variant="outline" className="text-xs">{session.difficulty_rating}/5</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <AssignWorkoutToClientDialog
        clientId={clientId}
        trainerId={trainerId}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
      />
    </div>
  );
}
