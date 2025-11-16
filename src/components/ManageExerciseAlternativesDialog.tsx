import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExercisePickerDialog } from "@/components/ExercisePickerDialog";

interface ManageExerciseAlternativesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: {
    id: string;
    name: string;
    muscle_group?: string;
  };
}

export function ManageExerciseAlternativesDialog({
  open,
  onOpenChange,
  exercise,
}: ManageExerciseAlternativesDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reason, setReason] = useState("");

  // Fetch existing alternatives
  const { data: alternatives } = useQuery({
    queryKey: ["exercise-alternatives", exercise.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_alternatives")
        .select(`
          *,
          alternative:exercises!exercise_alternatives_alternative_exercise_id_fkey(*)
        `)
        .eq("exercise_id", exercise.id);

      if (error) throw error;
      return data;
    },
    enabled: open && !!exercise.id,
  });

  // Fetch all exercises for picker
  const { data: exercises } = useQuery({
    queryKey: ["exercises", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .eq("trainer_id", user?.id)
        .neq("id", exercise.id)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: open && !!user?.id,
  });

  // Add alternative mutation
  const addAlternativeMutation = useMutation({
    mutationFn: async ({ alternativeId, reason }: { alternativeId: string; reason: string }) => {
      const { error } = await supabase.from("exercise_alternatives").insert({
        exercise_id: exercise.id,
        alternative_exercise_id: alternativeId,
        reason: reason,
        trainer_id: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-alternatives", exercise.id] });
      toast({
        title: "Alternative Added",
        description: "Exercise alternative has been added successfully",
      });
      setReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete alternative mutation
  const deleteAlternativeMutation = useMutation({
    mutationFn: async (alternativeId: string) => {
      const { error } = await supabase
        .from("exercise_alternatives")
        .delete()
        .eq("id", alternativeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-alternatives", exercise.id] });
      toast({
        title: "Alternative Removed",
        description: "Exercise alternative has been removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSelectExercise = (exerciseId: string) => {
    addAlternativeMutation.mutate({ alternativeId: exerciseId, reason });
    setPickerOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Exercise Alternatives</DialogTitle>
            <DialogDescription>
              Add alternative exercises for "{exercise.name}" that clients can swap during
              workouts
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add New Alternative */}
            <Card className="p-4 bg-muted/50">
              <div className="space-y-3">
                <div>
                  <Label>Reason for Alternative (Optional)</Label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., No equipment, Lower impact, Easier variation"
                  />
                </div>
                <Button onClick={() => setPickerOpen(true)} className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Add Alternative Exercise
                </Button>
              </div>
            </Card>

            {/* Existing Alternatives */}
            <div>
              <h3 className="font-semibold mb-3">Current Alternatives</h3>
              <ScrollArea className="h-[300px]">
                {alternatives && alternatives.length > 0 ? (
                  <div className="space-y-2">
                    {alternatives.map((alt) => {
                      const altExercise = alt.alternative;
                      return (
                        <Card key={alt.id} className="p-3">
                          <div className="flex gap-3">
                            {altExercise.image_url && (
                              <img
                                src={altExercise.image_url}
                                alt={altExercise.name}
                                className="w-16 h-16 rounded object-cover"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold truncate">{altExercise.name}</h4>
                              {alt.reason && (
                                <p className="text-sm text-primary">{alt.reason}</p>
                              )}
                              <div className="flex gap-2 mt-1">
                                {altExercise.muscle_group && (
                                  <Badge variant="outline" className="text-xs">
                                    {altExercise.muscle_group}
                                  </Badge>
                                )
                                }
                                {altExercise.equipment && (
                                  <Badge variant="outline" className="text-xs">
                                    {altExercise.equipment}
                                  </Badge>
                                )
                                }
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteAlternativeMutation.mutate(alt.id)}
                              disabled={deleteAlternativeMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No alternatives added yet. Add alternatives that clients can swap to
                    during workouts.
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ExercisePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        exercises={exercises || []}
        onSelectExercise={handleSelectExercise}
      />
    </>
  );
}

