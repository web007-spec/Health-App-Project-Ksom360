import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Dumbbell, Calendar, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { WorkoutDetailDialog } from "@/components/WorkoutDetailDialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const difficultyColors = {
  beginner: "bg-success/10 text-success",
  intermediate: "bg-accent/10 text-accent",
  advanced: "bg-destructive/10 text-destructive",
};

export default function ClientWorkouts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Fetch assigned workouts
  const { data: clientWorkouts, isLoading } = useQuery({
    queryKey: ["client-workouts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_workouts")
        .select(`
          *,
          workout_plan:workout_plans(
            *,
            workout_plan_exercises(
              *,
              exercise:exercises(*)
            )
          )
        `)
        .eq("client_id", user?.id)
        .order("assigned_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Mark workout as complete
  const completeWorkoutMutation = useMutation({
    mutationFn: async (workoutId: string) => {
      const { error } = await supabase
        .from("client_workouts")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", workoutId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-workouts"] });
      toast({
        title: "Great job!",
        description: "Workout marked as completed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark workout as complete",
        variant: "destructive",
      });
    },
  });

  const handleViewWorkout = (workout: any) => {
    setSelectedWorkout(workout);
    setDetailDialogOpen(true);
  };

  const handleMarkComplete = () => {
    if (selectedWorkout) {
      completeWorkoutMutation.mutate(selectedWorkout.id);
    }
  };

  const upcomingWorkouts = clientWorkouts?.filter((w) => !w.completed_at) || [];
  const completedWorkouts = clientWorkouts?.filter((w) => w.completed_at) || [];

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading workouts...</p>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Workouts</h1>
          <p className="text-muted-foreground mt-1">Your personalized training program</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Assigned</p>
                  <p className="text-2xl font-bold">{upcomingWorkouts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{completedWorkouts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Dumbbell className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{clientWorkouts?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Workouts */}
        {upcomingWorkouts.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Upcoming Workouts</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {upcomingWorkouts.map((workout) => (
                <Card key={workout.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">
                          {workout.workout_plan.name}
                        </CardTitle>
                        {workout.scheduled_date && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(workout.scheduled_date), "PPP")}
                          </p>
                        )}
                      </div>
                      <Badge
                        className={
                          difficultyColors[
                            workout.workout_plan.difficulty as keyof typeof difficultyColors
                          ]
                        }
                      >
                        {workout.workout_plan.difficulty}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Dumbbell className="h-4 w-4" />
                        <span>
                          {workout.workout_plan.workout_plan_exercises?.length || 0} exercises
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>{workout.workout_plan.duration_minutes} min</span>
                      </div>
                    </div>

                    {workout.notes && (
                      <p className="text-sm text-muted-foreground border-l-2 border-primary pl-3 italic">
                        {workout.notes}
                      </p>
                    )}

                    <Button
                      className="w-full"
                      onClick={() => handleViewWorkout(workout)}
                    >
                      Start Workout
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Completed Workouts */}
        {completedWorkouts.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Completed Workouts</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {completedWorkouts.map((workout) => (
                <Card key={workout.id} className="hover:shadow-lg transition-shadow opacity-75">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">
                          {workout.workout_plan.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          Completed on {format(new Date(workout.completed_at), "PPP")}
                        </p>
                      </div>
                      <Badge
                        className={
                          difficultyColors[
                            workout.workout_plan.difficulty as keyof typeof difficultyColors
                          ]
                        }
                      >
                        {workout.workout_plan.difficulty}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Dumbbell className="h-4 w-4" />
                        <span>
                          {workout.workout_plan.workout_plan_exercises?.length || 0} exercises
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>{workout.workout_plan.duration_minutes} min</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleViewWorkout(workout)}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && clientWorkouts?.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No workouts assigned yet</h3>
              <p className="text-muted-foreground">
                Your trainer will assign workouts to you soon. Check back later!
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Workout Detail Dialog */}
      <WorkoutDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        workout={selectedWorkout?.workout_plan}
        isCompleted={!!selectedWorkout?.completed_at}
        onMarkComplete={handleMarkComplete}
        completingWorkout={completeWorkoutMutation.isPending}
      />
    </ClientLayout>
  );
}
