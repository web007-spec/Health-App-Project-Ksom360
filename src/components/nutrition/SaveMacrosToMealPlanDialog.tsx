import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { Loader2 } from "lucide-react";

interface SaveMacrosToMealPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  macros: {
    targetCalories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
}

export function SaveMacrosToMealPlanDialog({
  open,
  onOpenChange,
  clientId,
  macros,
}: SaveMacrosToMealPlanDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [action, setAction] = useState<"new" | "existing">("new");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [planName, setPlanName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [duration, setDuration] = useState("30");

  // Fetch existing meal plans
  const { data: mealPlans, isLoading: plansLoading } = useQuery({
    queryKey: ["meal-plans", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("trainer_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  const createMealPlanMutation = useMutation({
    mutationFn: async () => {
      if (action === "new") {
        // Create new meal plan
        const { data: newPlan, error: planError } = await supabase
          .from("meal_plans")
          .insert({
            name: planName,
            description,
            trainer_id: user?.id,
            plan_type: "flexible",
            target_calories: macros.targetCalories,
            target_protein: macros.protein,
            target_carbs: macros.carbs,
            target_fats: macros.fats,
          })
          .select()
          .single();

        if (planError) throw planError;

        // Assign to client
        const endDate = addDays(new Date(startDate), parseInt(duration));
        const { error: assignError } = await supabase
          .from("client_meal_plan_assignments")
          .insert({
            client_id: clientId,
            meal_plan_id: newPlan.id,
            trainer_id: user?.id,
            plan_type: "flexible",
            start_date: startDate,
            end_date: format(endDate, "yyyy-MM-dd"),
          });

        if (assignError) throw assignError;
      } else {
        // Update existing meal plan
        const { error: updateError } = await supabase
          .from("meal_plans")
          .update({
            target_calories: macros.targetCalories,
            target_protein: macros.protein,
            target_carbs: macros.carbs,
            target_fats: macros.fats,
          })
          .eq("id", selectedPlanId);

        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plans"] });
      queryClient.invalidateQueries({ queryKey: ["client-meal-assignment"] });
      toast.success(
        action === "new" 
          ? "Meal plan created and assigned successfully!" 
          : "Meal plan targets updated successfully!"
      );
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("Failed to save meal plan: " + error.message);
    },
  });

  const resetForm = () => {
    setAction("new");
    setSelectedPlanId("");
    setPlanName("");
    setDescription("");
    setStartDate(format(new Date(), "yyyy-MM-dd"));
    setDuration("30");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (action === "new" && !planName.trim()) {
      toast.error("Please enter a meal plan name");
      return;
    }

    if (action === "existing" && !selectedPlanId) {
      toast.error("Please select a meal plan");
      return;
    }

    createMealPlanMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Save Macros to Meal Plan</DialogTitle>
          <DialogDescription>
            Create a new meal plan or update an existing one with these macro targets
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Macro Summary */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h4 className="font-semibold text-sm">Calculated Targets</h4>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Calories</p>
                <p className="font-bold">{macros.targetCalories}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Protein</p>
                <p className="font-bold">{macros.protein}g</p>
              </div>
              <div>
                <p className="text-muted-foreground">Carbs</p>
                <p className="font-bold">{macros.carbs}g</p>
              </div>
              <div>
                <p className="text-muted-foreground">Fats</p>
                <p className="font-bold">{macros.fats}g</p>
              </div>
            </div>
          </div>

          {/* Action Selection */}
          <div className="space-y-3">
            <Label>Action</Label>
            <RadioGroup value={action} onValueChange={(v) => setAction(v as "new" | "existing")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="new" id="new" />
                <Label htmlFor="new" className="font-normal cursor-pointer">
                  Create new meal plan
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existing" id="existing" />
                <Label htmlFor="existing" className="font-normal cursor-pointer">
                  Update existing meal plan targets
                </Label>
              </div>
            </RadioGroup>
          </div>

          {action === "new" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="planName">Meal Plan Name *</Label>
                <Input
                  id="planName"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g., Weight Loss Plan - 2000 cal"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add notes about this meal plan..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (days)</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">1 week</SelectItem>
                      <SelectItem value="14">2 weeks</SelectItem>
                      <SelectItem value="30">1 month</SelectItem>
                      <SelectItem value="60">2 months</SelectItem>
                      <SelectItem value="90">3 months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>Select Meal Plan *</Label>
              {plansLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a meal plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {mealPlans?.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMealPlanMutation.isPending}>
              {createMealPlanMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {action === "new" ? "Create & Assign" : "Update Targets"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
