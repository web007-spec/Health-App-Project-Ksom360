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
import { z } from "zod";

const recipeSchema = z.object({
  name: z.string().trim().min(1, "Recipe name is required").max(200),
  description: z.string().trim().max(1000).optional(),
  instructions: z.string().trim().max(5000).optional(),
  calories: z.number().min(0).max(10000),
  protein: z.number().min(0).max(1000),
  carbs: z.number().min(0).max(1000),
  fats: z.number().min(0).max(1000),
  prep_time_minutes: z.number().min(0).max(1440).optional(),
  cook_time_minutes: z.number().min(0).max(1440).optional(),
  servings: z.number().min(1).max(100).optional(),
  tags: z.string().optional(),
});

interface CreateRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRecipeDialog({ open, onOpenChange }: CreateRecipeDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    instructions: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    prep_time_minutes: "",
    cook_time_minutes: "",
    servings: "1",
    tags: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const parsed = recipeSchema.parse({
        ...formData,
        calories: Number(formData.calories),
        protein: Number(formData.protein),
        carbs: Number(formData.carbs),
        fats: Number(formData.fats),
        prep_time_minutes: formData.prep_time_minutes ? Number(formData.prep_time_minutes) : undefined,
        cook_time_minutes: formData.cook_time_minutes ? Number(formData.cook_time_minutes) : undefined,
        servings: formData.servings ? Number(formData.servings) : undefined,
      });

      const tags = formData.tags
        .split(",")
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const { error } = await supabase.from("recipes").insert([{
        trainer_id: user?.id!,
        name: parsed.name,
        description: parsed.description || null,
        instructions: parsed.instructions || null,
        calories: parsed.calories,
        protein: parsed.protein,
        carbs: parsed.carbs,
        fats: parsed.fats,
        prep_time_minutes: parsed.prep_time_minutes || null,
        cook_time_minutes: parsed.cook_time_minutes || null,
        servings: parsed.servings || 1,
        tags: tags.length > 0 ? tags : null,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Recipe created!");
      onOpenChange(false);
      setFormData({
        name: "",
        description: "",
        instructions: "",
        calories: "",
        protein: "",
        carbs: "",
        fats: "",
        prep_time_minutes: "",
        cook_time_minutes: "",
        servings: "1",
        tags: "",
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create recipe");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Recipe</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Recipe Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Grilled Chicken Salad"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the recipe"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label htmlFor="calories">Calories *</Label>
              <Input
                id="calories"
                type="number"
                value={formData.calories}
                onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="protein">Protein (g) *</Label>
              <Input
                id="protein"
                type="number"
                step="0.1"
                value={formData.protein}
                onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="carbs">Carbs (g) *</Label>
              <Input
                id="carbs"
                type="number"
                step="0.1"
                value={formData.carbs}
                onChange={(e) => setFormData({ ...formData, carbs: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="fats">Fats (g) *</Label>
              <Input
                id="fats"
                type="number"
                step="0.1"
                value={formData.fats}
                onChange={(e) => setFormData({ ...formData, fats: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="prep_time">Prep Time (min)</Label>
              <Input
                id="prep_time"
                type="number"
                value={formData.prep_time_minutes}
                onChange={(e) => setFormData({ ...formData, prep_time_minutes: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cook_time">Cook Time (min)</Label>
              <Input
                id="cook_time"
                type="number"
                value={formData.cook_time_minutes}
                onChange={(e) => setFormData({ ...formData, cook_time_minutes: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="servings">Servings</Label>
              <Input
                id="servings"
                type="number"
                value={formData.servings}
                onChange={(e) => setFormData({ ...formData, servings: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="Step-by-step cooking instructions"
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g., High Protein, Low Carb, Vegetarian"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create Recipe"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
