import { DashboardLayout } from "@/components/DashboardLayout";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ExercisePickerDialog } from "@/components/ExercisePickerDialog";

export default function EditWorkout() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [workoutData, setWorkoutData] = useState({
    name: "",
    description: "",
    category: "",
    difficulty: "beginner" as "beginner" | "intermediate" | "advanced",
    duration_minutes: 30,
    video_url: "",
    image_url: "",
  });

  const [selectedExercises, setSelectedExercises] = useState<any[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);

  // Fetch workout data
  const { data: workout, isLoading: workoutLoading } = useQuery({
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

  // Load workout data into form
  useEffect(() => {
    if (workout) {
      setWorkoutData({
        name: workout.name,
        description: workout.description || "",
        category: workout.category,
        difficulty: workout.difficulty,
        duration_minutes: workout.duration_minutes,
        video_url: workout.video_url || "",
        image_url: workout.image_url || "",
      });

      const exercises = workout.workout_plan_exercises
        ?.sort((a, b) => a.order_index - b.order_index)
        .map((wpe) => ({
          id: wpe.id,
          exercise_id: wpe.exercise_id,
          sets: wpe.sets,
          reps: wpe.reps,
          duration_seconds: wpe.duration_seconds,
          rest_seconds: wpe.rest_seconds,
          notes: wpe.notes,
        })) || [];

      setSelectedExercises(exercises);
    }
  }, [workout]);

  const { data: exercises } = useQuery({
    queryKey: ["exercises", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .eq("trainer_id", user?.id)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const updateWorkoutMutation = useMutation({
    mutationFn: async () => {
      // Update workout plan
      const { error: workoutError } = await supabase
        .from("workout_plans")
        .update({
          ...workoutData,
        })
        .eq("id", id);

      if (workoutError) throw workoutError;

      // Delete existing exercises
      const { error: deleteError } = await supabase
        .from("workout_plan_exercises")
        .delete()
        .eq("workout_plan_id", id);

      if (deleteError) throw deleteError;

      // Add updated exercises
      if (selectedExercises.length > 0) {
        const exercisesToInsert = selectedExercises.map((ex, index) => ({
          workout_plan_id: id,
          exercise_id: ex.exercise_id,
          order_index: index,
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
      queryClient.invalidateQueries({ queryKey: ["workout-detail", id] });
      toast({
        title: "Success!",
        description: "Workout plan updated successfully",
      });
      navigate(`/workouts/${id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addExercise = () => {
    setSelectedExercises([
      ...selectedExercises,
      {
        exercise_id: "",
        sets: 3,
        reps: 12,
        duration_seconds: null,
        rest_seconds: 60,
        notes: "",
      },
    ]);
  };

  const removeExercise = (index: number) => {
    setSelectedExercises(selectedExercises.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, field: string, value: any) => {
    const updated = [...selectedExercises];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedExercises(updated);
  };

  const openExercisePicker = (index: number) => {
    setEditingExerciseIndex(index);
    setPickerOpen(true);
  };

  const handleExerciseSelect = (exerciseId: string) => {
    if (editingExerciseIndex !== null) {
      updateExercise(editingExerciseIndex, "exercise_id", exerciseId);
    }
  };

  const getExerciseName = (exerciseId: string) => {
    return exercises?.find(ex => ex.id === exerciseId)?.name || "Select exercise";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workoutData.name || !workoutData.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    updateWorkoutMutation.mutate();
  };

  if (workoutLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading workout...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/workouts/${id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Workout Plan</h1>
            <p className="text-muted-foreground mt-1">Update your workout details</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Workout Name *</Label>
                  <Input
                    id="name"
                    value={workoutData.name}
                    onChange={(e) => setWorkoutData({ ...workoutData, name: e.target.value })}
                    placeholder="e.g., Upper Body Strength"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Input
                    id="category"
                    value={workoutData.category}
                    onChange={(e) => setWorkoutData({ ...workoutData, category: e.target.value })}
                    placeholder="e.g., Strength, Cardio, HIIT"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={workoutData.description}
                  onChange={(e) => setWorkoutData({ ...workoutData, description: e.target.value })}
                  placeholder="Describe the workout goals and focus areas..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="video_url">Demo Video URL</Label>
                  <Input
                    id="video_url"
                    value={workoutData.video_url}
                    onChange={(e) => setWorkoutData({ ...workoutData, video_url: e.target.value })}
                    placeholder="https://vimeo.com/..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image_url">Cover Image URL</Label>
                  <Input
                    id="image_url"
                    value={workoutData.image_url}
                    onChange={(e) => setWorkoutData({ ...workoutData, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select
                    value={workoutData.difficulty}
                    onValueChange={(value: any) => setWorkoutData({ ...workoutData, difficulty: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={workoutData.duration_minutes}
                    onChange={(e) => setWorkoutData({ ...workoutData, duration_minutes: parseInt(e.target.value) })}
                    min="1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Exercises</CardTitle>
                <Button type="button" onClick={addExercise} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Exercise
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedExercises.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No exercises added yet. Click "Add Exercise" to get started.
                </p>
              ) : (
                selectedExercises.map((ex, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-start gap-4">
                      <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <Label>Exercise</Label>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full justify-start"
                              onClick={() => openExercisePicker(index)}
                            >
                              {getExerciseName(ex.exercise_id)}
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeExercise(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-4">
                          <div>
                            <Label>Sets</Label>
                            <Input
                              type="number"
                              value={ex.sets || ""}
                              onChange={(e) => updateExercise(index, "sets", parseInt(e.target.value))}
                              min="1"
                            />
                          </div>
                          <div>
                            <Label>Reps</Label>
                            <Input
                              type="number"
                              value={ex.reps || ""}
                              onChange={(e) => updateExercise(index, "reps", parseInt(e.target.value))}
                              min="1"
                            />
                          </div>
                          <div>
                            <Label>Duration (s)</Label>
                            <Input
                              type="number"
                              value={ex.duration_seconds || ""}
                              onChange={(e) => updateExercise(index, "duration_seconds", parseInt(e.target.value))}
                              min="1"
                            />
                          </div>
                          <div>
                            <Label>Rest (s)</Label>
                            <Input
                              type="number"
                              value={ex.rest_seconds || ""}
                              onChange={(e) => updateExercise(index, "rest_seconds", parseInt(e.target.value))}
                              min="0"
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Notes</Label>
                          <Input
                            value={ex.notes || ""}
                            onChange={(e) => updateExercise(index, "notes", e.target.value)}
                            placeholder="Special instructions..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate(`/workouts/${id}`)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateWorkoutMutation.isPending}>
              {updateWorkoutMutation.isPending ? "Updating..." : "Update Workout"}
            </Button>
          </div>
        </form>
      </div>

      <ExercisePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        exercises={exercises || []}
        selectedExerciseId={editingExerciseIndex !== null ? selectedExercises[editingExerciseIndex]?.exercise_id : undefined}
        onSelectExercise={handleExerciseSelect}
      />
    </DashboardLayout>
  );
}
