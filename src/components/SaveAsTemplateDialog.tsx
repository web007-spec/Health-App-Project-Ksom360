import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutId: string;
  workoutName: string;
}

export function SaveAsTemplateDialog({
  open,
  onOpenChange,
  workoutId,
  workoutName,
}: SaveAsTemplateDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [templateCategory, setTemplateCategory] = useState("");
  const [templateName, setTemplateName] = useState(`${workoutName} Template`);

  const saveAsTemplateMutation = useMutation({
    mutationFn: async () => {
      // Fetch original workout
      const { data: original, error: fetchError } = await supabase
        .from("workout_plans")
        .select("*")
        .eq("id", workoutId)
        .single();
      if (fetchError) throw fetchError;

      // Create a NEW template copy — original workout is untouched
      const { data: newTemplate, error: createError } = await supabase
        .from("workout_plans")
        .insert({
          name: templateName || workoutName,
          description: original.description,
          category: original.category,
          difficulty: original.difficulty,
          duration_minutes: original.duration_minutes,
          image_url: original.image_url,
          trainer_id: user?.id,
          is_template: true,
          template_category: templateCategory || null,
        })
        .select()
        .single();
      if (createError) throw createError;

      // Copy exercises to template
      const { data: exercises, error: exError } = await supabase
        .from("workout_plan_exercises")
        .select("*")
        .eq("workout_plan_id", workoutId);
      if (exError) throw exError;

      if (exercises && exercises.length > 0) {
        const { error: insertError } = await supabase
          .from("workout_plan_exercises")
          .insert(
            exercises.map((ex) => ({
              workout_plan_id: newTemplate.id,
              exercise_id: ex.exercise_id,
              sets: ex.sets,
              reps: ex.reps,
              duration_seconds: ex.duration_seconds,
              rest_seconds: ex.rest_seconds,
              order_index: ex.order_index,
              notes: ex.notes,
              tempo: ex.tempo,
            }))
          );
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
      queryClient.invalidateQueries({ queryKey: ["workout-templates"] });
      toast({
        title: "Template Saved",
        description: `"${templateName || workoutName}" has been saved as a template`,
      });
      onOpenChange(false);
      setTemplateCategory("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveAsTemplateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              A copy of "{workoutName}" will be saved as a reusable template. Your original workout stays unchanged.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name..."
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="template-category">Category (Optional)</Label>
              <Input
                id="template-category"
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                placeholder="e.g., Beginner, HIIT, Strength Training"
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Organize templates by category for easier browsing
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveAsTemplateMutation.isPending}
            >
              {saveAsTemplateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save as Template
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
