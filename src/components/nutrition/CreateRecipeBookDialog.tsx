import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CreateRecipeBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRecipeBookDialog({ open, onOpenChange }: CreateRecipeBookDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("recipe_books").insert([{
        trainer_id: user?.id!,
        name: formData.name,
        description: formData.description || null,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-books"] });
      toast.success("Recipe book created!");
      onOpenChange(false);
      setFormData({ name: "", description: "" });
    },
    onError: () => {
      toast.error("Failed to create recipe book");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Recipe Book</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Book Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., High Protein Meal Plan"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this recipe collection"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !formData.name}
          >
            {createMutation.isPending ? "Creating..." : "Create Book"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
