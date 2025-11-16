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
  const queryClient = useQueryClient();
  const [templateCategory, setTemplateCategory] = useState("");

  const saveAsTemplateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("workout_plans")
        .update({
          is_template: true,
          template_category: templateCategory || null,
        })
        .eq("id", workoutId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
      queryClient.invalidateQueries({ queryKey: ["workout-templates"] });
      toast({
        title: "Template Saved",
        description: `"${workoutName}" has been saved as a template`,
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
              Save "{workoutName}" as a reusable template. You can quickly create new
              workouts from this template in the future.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="template-category">
              Template Category (Optional)
            </Label>
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
