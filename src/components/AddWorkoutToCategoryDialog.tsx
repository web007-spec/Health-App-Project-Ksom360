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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Play, Dumbbell, Search, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedWorkouts, setSelectedWorkouts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

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

  const { data: allCategoryWorkouts } = useQuery({
    queryKey: ["category-workout-ids", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_workouts")
        .select("workout_id")
        .eq("category_id", categoryId);
      if (error) throw error;
      return data?.map((cw) => cw.workout_id) || [];
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
      queryClient.invalidateQueries({ queryKey: ["category-workout-ids", categoryId] });
      toast({ title: `${selectedWorkouts.length} workout(s) added successfully` });
      onOpenChange(false);
      setSelectedWorkouts([]);
      setSearchQuery("");
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

  // Filter out already-added workouts and apply search
  const availableWorkouts = workouts?.filter((w) => {
    const alreadyAdded = allCategoryWorkouts?.includes(w.id);
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase());
    return !alreadyAdded && matchesSearch;
  });

  const selectAll = () => {
    if (!availableWorkouts) return;
    setSelectedWorkouts(availableWorkouts.map((w) => w.id));
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
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose your On-demand Workouts</DialogTitle>
          <DialogDescription>
            Add workouts to display under this Category
          </DialogDescription>
        </DialogHeader>

        {/* Search + Filter + Select All */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by keyword or name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select all
          </Button>
        </div>

        <p className="text-sm font-medium text-primary">
          All Workouts ({availableWorkouts?.length || 0})
        </p>

        {/* Scrollable workout list */}
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0 -mx-6 px-6">
          {!availableWorkouts?.length ? (
            <p className="text-center text-muted-foreground py-8">
              No workouts available.
            </p>
          ) : (
            availableWorkouts.map((workout) => {
              const labels =
                workout.workout_workout_labels?.map((l: any) => l.workout_labels) || [];
              const levelLabel = labels.find((l: any) => l?.category === "level");
              const durationLabel = labels.find((l: any) => l?.category === "duration");
              const otherLabels = labels.filter(
                (l: any) => l && l.category !== "level" && l.category !== "duration"
              );

              return (
                <div
                  key={workout.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer border border-transparent hover:border-border"
                  onClick={() => toggleWorkout(workout.id)}
                >
                  {workout.thumbnail_url ? (
                    <div className="relative w-20 h-14 rounded overflow-hidden flex-shrink-0">
                      <img
                        src={workout.thumbnail_url}
                        alt={workout.name}
                        className="w-full h-full object-cover"
                      />
                      {workout.type === "video" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <Play className="h-4 w-4 text-white fill-white" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-20 h-14 bg-muted flex items-center justify-center rounded flex-shrink-0">
                      {workout.type === "video" ? (
                        <Play className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Dumbbell className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{workout.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {durationLabel?.value || ""}{durationLabel && levelLabel ? " · " : ""}{levelLabel?.value || ""}
                    </p>
                    {otherLabels.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-1">
                        {otherLabels.map((l: any) => (
                          <Badge key={l.id} variant="outline" className="text-[10px] px-1.5 py-0 uppercase">
                            {l.value}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Checkbox
                    checked={selectedWorkouts.includes(workout.id)}
                    onCheckedChange={() => toggleWorkout(workout.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="text-primary gap-1"
            onClick={() => {
              onOpenChange(false);
              navigate("/ondemand-workouts");
            }}
          >
            <Plus className="h-4 w-4" />
            Add New On-Demand Workout
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setSelectedWorkouts([]);
                setSearchQuery("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={addMutation.isPending || selectedWorkouts.length === 0}
            >
              {addMutation.isPending ? "Adding..." : `Add`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
