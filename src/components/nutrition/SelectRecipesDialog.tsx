import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search } from "lucide-react";

interface SelectRecipesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealPlanId: string;
  mealType: string;
  mode: "flexible" | "structured";
  selectedDate?: Date;
  weekNumber?: number;
  dayOfWeek?: number;
}

export function SelectRecipesDialog({
  open,
  onOpenChange,
  mealPlanId,
  mealType,
  mode,
  selectedDate,
  weekNumber = 1,
  dayOfWeek = 0,
}: SelectRecipesDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);
  const [servings, setServings] = useState<Record<string, number>>({});

  const { data: recipes } = useQuery({
    queryKey: ["recipes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("trainer_id", user?.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  const filteredRecipes = recipes?.filter(recipe =>
    recipe.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addRecipesMutation = useMutation({
    mutationFn: async () => {
      if (mode === "flexible") {
        const inserts = selectedRecipes.map((recipeId, index) => ({
          meal_plan_id: mealPlanId,
          meal_type: mealType as any,
          recipe_id: recipeId,
          order_index: index,
          week_number: weekNumber,
        }));
        const { error } = await supabase.from("meal_plan_flexible_options").insert(inserts);
        if (error) throw error;
      } else {
        const planDate = selectedDate
          ? selectedDate.toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];
        const inserts = selectedRecipes.map((recipeId, index) => ({
          meal_plan_id: mealPlanId,
          plan_date: planDate,
          meal_type: mealType as any,
          recipe_id: recipeId,
          servings: servings[recipeId] || 1,
          order_index: index,
          week_number: weekNumber,
          day_of_week: dayOfWeek,
        }));
        const { error } = await supabase.from("meal_plan_days").insert(inserts);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flexible-week-options"] });
      queryClient.invalidateQueries({ queryKey: ["structured-week-meals"] });
      queryClient.invalidateQueries({ queryKey: ["meal-plan-flexible-options"] });
      queryClient.invalidateQueries({ queryKey: ["meal-plan-days"] });
      toast.success(`Added ${selectedRecipes.length} recipe(s)`);
      onOpenChange(false);
      setSelectedRecipes([]);
      setServings({});
      setSearchQuery("");
    },
    onError: () => {
      toast.error("Failed to add recipes");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Add Recipes to {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
          </DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredRecipes && filteredRecipes.length > 0 ? (
            filteredRecipes.map((recipe) => (
              <div key={recipe.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent">
                <Checkbox
                  checked={selectedRecipes.includes(recipe.id)}
                  onCheckedChange={(checked) => {
                    setSelectedRecipes(prev =>
                      checked ? [...prev, recipe.id] : prev.filter(id => id !== recipe.id)
                    );
                    if (!checked) {
                      const newServings = { ...servings };
                      delete newServings[recipe.id];
                      setServings(newServings);
                    }
                  }}
                />
                <div className="flex-1">
                  <h4 className="font-semibold">{recipe.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {recipe.calories} cal · P{recipe.protein}g · C{recipe.carbs}g · F{recipe.fats}g
                  </p>
                  {recipe.tags && recipe.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {recipe.tags.slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                {mode === "structured" && selectedRecipes.includes(recipe.id) && (
                  <div className="w-24">
                    <Label htmlFor={`servings-${recipe.id}`} className="text-xs">Servings</Label>
                    <Input
                      id={`servings-${recipe.id}`}
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={servings[recipe.id] || 1}
                      onChange={(e) => setServings({ ...servings, [recipe.id]: Number(e.target.value) })}
                      className="h-8"
                    />
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">No recipes found</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => addRecipesMutation.mutate()}
            disabled={selectedRecipes.length === 0 || addRecipesMutation.isPending}
          >
            {addRecipesMutation.isPending ? "Adding..." : `Add ${selectedRecipes.length} Recipe(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
