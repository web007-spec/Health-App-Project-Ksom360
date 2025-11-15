import { DashboardLayout } from "@/components/DashboardLayout";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Dumbbell, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function WorkoutDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: workout, isLoading } = useQuery({
    queryKey: ["workout-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_plans")
        .select(`
          *,
          workout_plan_exercises(
            *,
            exercise:exercises(*)
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!workout) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Workout not found</h2>
          <Button onClick={() => navigate("/workouts")}>Back to Workouts</Button>
        </div>
      </DashboardLayout>
    );
  }

  const difficultyColors = {
    beginner: "bg-green-500/10 text-green-700 dark:text-green-400",
    intermediate: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    advanced: "bg-red-500/10 text-red-700 dark:text-red-400",
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/workouts")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{workout.name}</h1>
            <p className="text-muted-foreground mt-1">{workout.description}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="text-xl font-bold">{workout.duration_minutes} min</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Difficulty</p>
                  <Badge className={difficultyColors[workout.difficulty as keyof typeof difficultyColors]}>
                    {workout.difficulty}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Dumbbell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="text-xl font-bold">{workout.category}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Dumbbell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Exercises</p>
                  <p className="text-xl font-bold">{workout.workout_plan_exercises?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Exercises</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workout.workout_plan_exercises
                ?.sort((a, b) => a.order_index - b.order_index)
                .map((wpe, index) => (
                  <div key={wpe.id} className="border rounded-lg p-4 hover:border-primary/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{wpe.exercise?.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{wpe.exercise?.description}</p>
                        
                        <div className="flex flex-wrap gap-4 mt-3">
                          {wpe.sets && (
                            <div className="text-sm">
                              <span className="font-medium">Sets:</span> {wpe.sets}
                            </div>
                          )}
                          {wpe.reps && (
                            <div className="text-sm">
                              <span className="font-medium">Reps:</span> {wpe.reps}
                            </div>
                          )}
                          {wpe.duration_seconds && (
                            <div className="text-sm">
                              <span className="font-medium">Duration:</span> {wpe.duration_seconds}s
                            </div>
                          )}
                          {wpe.rest_seconds && (
                            <div className="text-sm">
                              <span className="font-medium">Rest:</span> {wpe.rest_seconds}s
                            </div>
                          )}
                        </div>

                        {wpe.exercise?.muscle_group && (
                          <Badge variant="outline" className="mt-2">
                            {wpe.exercise.muscle_group}
                          </Badge>
                        )}

                        {wpe.notes && (
                          <p className="text-sm text-muted-foreground mt-2 italic">{wpe.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}