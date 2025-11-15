import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Dumbbell } from "lucide-react";

interface AddWorkoutToCategoryDialogProps {
  categoryId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddWorkoutToCategoryDialog({
  categoryId,
  open,
  onOpenChange,
}: AddWorkoutToCategoryDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedWorkouts, setSelectedWorkouts] = useState<string[]>([]);

  const { data: workouts } = useQuery({
    queryKey: ["ondemand-workouts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ondemand_workouts")
        .select(`
          *,
          workout_workout_labels(
            workout_labels(*)
          )
        `)
        .eq("trainer_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  const { data: existingWorkouts } = useQuery({
    queryKey: ["category-workouts", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_workouts")
        .select("workout_id, order_index")
        .eq("category_id", categoryId)
        .order("order_index", { ascending: false })
        .limit(1);

      if (error) throw error;
      return data;
    },
    enabled: !!categoryId && open,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = existingWorkouts?.[0]?.order_index ?? -1;
      
      const inserts = selectedWorkouts.map((workoutId, index) => ({
        category_id: categoryId,
        workout_id: workoutId,
        order_index: maxOrder + index + 1,
      }));

      const { error } = await supabase.from("category_workouts").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-collection"] });
      toast({ title: `${selectedWorkouts.length} workout(s) added successfully` });
      onOpenChange(false);
      setSelectedWorkouts([]);
    },
    onError: () => {
      toast({ title: "Failed to add workouts", variant: "destructive" });
    },
  });

  const toggleWorkout = (workoutId: string) => {
    setSelectedWorkouts((prev) =>
      prev.includes(workoutId)
        ? prev.filter((id) => id !== workoutId)
        : [...prev, workoutId]
    );
  };

  const handleSubmit = () => {
    if (selectedWorkouts.length === 0) {
      toast({ title: "Please select at least one workout", variant: "destructive" });
      return;
    }
    addMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Workouts to Category</DialogTitle>
          <DialogDescription>
            Select workouts to add to this category
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!workouts?.length ? (
            <p className="text-center text-muted-foreground py-8">
              No workouts available. Create on-demand workouts first.
            </p>
          ) : (
            workouts.map((workout) => {
              const labels =
                workout.workout_workout_labels?.map((l: any) => l.workout_labels) || [];
              const levelLabel = labels.find((l: any) => l?.category === "level");
              const durationLabel = labels.find((l: any) => l?.category === "duration");

              return (
                <Card
                  key={workout.id}
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => toggleWorkout(workout.id)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <Checkbox
                      checked={selectedWorkouts.includes(workout.id)}
                      onCheckedChange={() => toggleWorkout(workout.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {workout.thumbnail_url ? (
                      <img
                        src={workout.thumbnail_url}
                        alt={workout.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted flex items-center justify-center rounded">
                        {workout.type === "video" ? (
                          <Play className="h-6 w-6 text-muted-foreground" />
                        ) : (
                          <Dumbbell className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{workout.name}</p>
                      <div className="flex gap-2 mt-1">
                        {levelLabel && (
                          <Badge variant="secondary" className="text-xs">
                            {levelLabel.value}
                          </Badge>
                        )}
                        {durationLabel && (
                          <Badge variant="outline" className="text-xs">
                            {durationLabel.value}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge variant="default" className="capitalize">
                      {workout.type}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => {
              onOpenChange(false);
              setSelectedWorkouts([]);
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={handleSubmit}
            disabled={addMutation.isPending || selectedWorkouts.length === 0}
          >
            {addMutation.isPending ? "Adding..." : `Add ${selectedWorkouts.length} Workout(s)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
