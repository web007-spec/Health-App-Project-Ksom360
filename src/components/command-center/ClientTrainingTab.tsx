import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Dumbbell, Plus, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";

interface Props {
  clientId: string;
  trainerId: string;
}

export function ClientTrainingTab({ clientId, trainerId }: Props) {
  const navigate = useNavigate();

  const { data: assignedWorkouts } = useQuery({
    queryKey: ["client-assigned-workouts", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_workouts")
        .select(`
          *,
          workout_plan:workout_plans(name, category, difficulty, duration_minutes)
        `)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Training</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/clients/${clientId}/workout-history`)}>
            <Eye className="h-4 w-4 mr-1" /> Full History
          </Button>
        </div>
      </div>

      {/* Assigned Workouts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assigned Workouts</CardTitle>
        </CardHeader>
        <CardContent>
          {assignedWorkouts && assignedWorkouts.length > 0 ? (
            <div className="space-y-3">
              {assignedWorkouts.map((aw: any) => (
                <div key={aw.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Dumbbell className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{aw.workout_plan?.name || "Workout"}</p>
                      <p className="text-xs text-muted-foreground">
                        {aw.scheduled_date ? format(new Date(aw.scheduled_date), "MMM dd, yyyy") : "No date"}
                        {aw.workout_plan?.difficulty && ` · ${aw.workout_plan.difficulty}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant={aw.completed_at ? "default" : "secondary"} className="text-xs">
                    {aw.completed_at ? "Completed" : "Pending"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No workouts assigned yet</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions && sessions.length > 0 ? (
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
                    <Badge variant="outline" className="text-xs">
                      {session.difficulty_rating}/5
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No sessions logged yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
