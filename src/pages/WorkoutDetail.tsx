import { DashboardLayout } from "@/components/DashboardLayout";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Dumbbell, Target, Edit, Copy, Trash2, Play } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function WorkoutDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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

  const deleteWorkoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("workout_plans")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
      toast({
        title: "Success",
        description: "Workout deleted successfully",
      });
      navigate("/workouts");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const duplicateWorkoutMutation = useMutation({
    mutationFn: async () => {
      if (!workout) return;

      // Create duplicate workout
      const { data: newWorkout, error: workoutError } = await supabase
        .from("workout_plans")
        .insert({
          name: `${workout.name} (Copy)`,
          description: workout.description,
          category: workout.category,
          difficulty: workout.difficulty,
          duration_minutes: workout.duration_minutes,
          video_url: workout.video_url,
          image_url: workout.image_url,
          trainer_id: workout.trainer_id,
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Copy exercises
      if (workout.workout_plan_exercises && workout.workout_plan_exercises.length > 0) {
        const exercisesToInsert = workout.workout_plan_exercises.map((ex) => ({
          workout_plan_id: newWorkout.id,
          exercise_id: ex.exercise_id,
          order_index: ex.order_index,
          sets: ex.sets,
          reps: ex.reps,
          duration_seconds: ex.duration_seconds,
          rest_seconds: ex.rest_seconds,
          notes: ex.notes,
        }));

        const { error: exercisesError } = await supabase
          .from("workout_plan_exercises")
          .insert(exercisesToInsert);

        if (exercisesError) throw exercisesError;
      }

      return newWorkout;
    },
    onSuccess: (newWorkout) => {
      queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
      toast({
        title: "Success",
        description: "Workout duplicated successfully",
      });
      navigate(`/workouts/${newWorkout.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
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
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/workouts")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{workout.name}</h1>
              <p className="text-muted-foreground mt-1">{workout.description}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/workouts/edit/${id}`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => duplicateWorkoutMutation.mutate()}
              disabled={duplicateWorkoutMutation.isPending}
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
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
                      {wpe.exercise?.image_url ? (
                        <img
                          src={wpe.exercise.image_url}
                          alt={wpe.exercise.name}
                          className="w-24 h-24 object-cover rounded-lg shrink-0"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center shrink-0">
                          <span className="text-2xl font-bold text-primary/30">
                            {index + 1}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold">{wpe.exercise?.name}</h3>
                            {wpe.exercise?.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {wpe.exercise.description}
                              </p>
                            )}
                          </div>
                          {wpe.exercise?.video_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(wpe.exercise?.video_url || '', '_blank')}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        
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

                        <div className="flex flex-wrap gap-2 mt-2">
                          {wpe.exercise?.muscle_group && (
                            <Badge variant="outline" className="capitalize">
                              {wpe.exercise.muscle_group}
                            </Badge>
                          )}
                          {wpe.exercise?.equipment && (
                            <Badge variant="secondary" className="capitalize">
                              {wpe.exercise.equipment}
                            </Badge>
                          )}
                        </div>

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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{workout.name}" and all its exercises.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteWorkoutMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}