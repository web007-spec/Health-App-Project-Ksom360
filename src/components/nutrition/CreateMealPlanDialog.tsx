import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface CreateMealPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: "flexible" | "structured";
}

export function CreateMealPlanDialog({ open, onOpenChange, initialType }: CreateMealPlanDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    plan_type: initialType || "flexible",
    num_weeks: "1",
    target_calories: "",
    target_protein: "",
    target_carbs: "",
    target_fats: "",
  });

  useEffect(() => {
    if (initialType) {
      setFormData(prev => ({ ...prev, plan_type: initialType }));
    }
  }, [initialType]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("meal_plans")
        .insert([{
          trainer_id: user?.id!,
          name: formData.name,
          description: formData.description || null,
          plan_type: formData.plan_type as any,
          num_weeks: Number(formData.num_weeks) || 1,
          target_calories: formData.target_calories ? Number(formData.target_calories) : null,
          target_protein: formData.target_protein ? Number(formData.target_protein) : null,
          target_carbs: formData.target_carbs ? Number(formData.target_carbs) : null,
          target_fats: formData.target_fats ? Number(formData.target_fats) : null,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["meal-plans"] });
      toast.success("Meal plan created!");
      onOpenChange(false);
      navigate(`/meal-plans/${data.id}`);
    },
    onError: () => {
      toast.error("Failed to create meal plan");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Meal Plan</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Plan Type</Label>
            <RadioGroup
              value={formData.plan_type}
              onValueChange={(value) => setFormData({ ...formData, plan_type: value as "flexible" | "structured" })}
              className="mt-2"
            >
              <div className="flex items-center space-x-2 border rounded-lg p-4">
                <RadioGroupItem value="flexible" id="flexible" />
                <Label htmlFor="flexible" className="flex-1 cursor-pointer">
                  <div className="font-semibold">Flexible Meal Plan</div>
                  <div className="text-sm text-muted-foreground">
                    Clients choose from meal options you provide. Tracks weekly nutrition averages.
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-4">
                <RadioGroupItem value="structured" id="structured" />
                <Label htmlFor="structured" className="flex-1 cursor-pointer">
                  <div className="font-semibold">Structured Meal Plan</div>
                  <div className="text-sm text-muted-foreground">
                    Assign specific meals to specific days. Tracks daily nutrition totals.
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Plan Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., 2000 Cal High Protein Plan"
              />
            </div>
            <div>
              <Label htmlFor="weeks">Number of Weeks</Label>
              <Input
                id="weeks"
                type="number"
                min="1"
                max="52"
                value={formData.num_weeks}
                onChange={(e) => setFormData({ ...formData, num_weeks: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this meal plan"
              rows={2}
            />
          </div>

          <div>
            <Label>Daily Nutrition Targets (Optional)</Label>
            <div className="grid grid-cols-4 gap-4 mt-2">
              <div>
                <Label htmlFor="calories" className="text-xs">Calories</Label>
                <Input
                  id="calories"
                  type="number"
                  value={formData.target_calories}
                  onChange={(e) => setFormData({ ...formData, target_calories: e.target.value })}
                  placeholder="2000"
                />
              </div>
              <div>
                <Label htmlFor="protein" className="text-xs">Protein (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  value={formData.target_protein}
                  onChange={(e) => setFormData({ ...formData, target_protein: e.target.value })}
                  placeholder="150"
                />
              </div>
              <div>
                <Label htmlFor="carbs" className="text-xs">Carbs (g)</Label>
                <Input
                  id="carbs"
                  type="number"
                  value={formData.target_carbs}
                  onChange={(e) => setFormData({ ...formData, target_carbs: e.target.value })}
                  placeholder="200"
                />
              </div>
              <div>
                <Label htmlFor="fats" className="text-xs">Fats (g)</Label>
                <Input
                  id="fats"
                  type="number"
                  value={formData.target_fats}
                  onChange={(e) => setFormData({ ...formData, target_fats: e.target.value })}
                  placeholder="60"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !formData.name}
          >
            {createMutation.isPending ? "Creating..." : "Create & Build Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
