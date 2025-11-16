import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { SelectRecipesDialog } from "./SelectRecipesDialog";
import { toast } from "sonner";

interface FlexibleMealPlanBuilderProps {
  mealPlanId: string;
}

export function FlexibleMealPlanBuilder({ mealPlanId }: FlexibleMealPlanBuilderProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMealType, setSelectedMealType] = useState<string | null>(null);

  const { data: options } = useQuery({
    queryKey: ["meal-plan-flexible-options", mealPlanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_plan_flexible_options")
        .select(`
          *,
          recipes (*)
        `)
        .eq("meal_plan_id", mealPlanId)
        .order("meal_type")
        .order("order_index");

      if (error) throw error;
      return data;
    },
    enabled: !!mealPlanId,
  });

  const removeOptionMutation = useMutation({
    mutationFn: async (optionId: string) => {
      const { error } = await supabase
        .from("meal_plan_flexible_options")
        .delete()
        .eq("id", optionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plan-flexible-options"] });
      toast.success("Option removed");
    },
  });

  const groupedOptions = options?.reduce((acc: any, option: any) => {
    if (!acc[option.meal_type]) acc[option.meal_type] = [];
    acc[option.meal_type].push(option);
    return acc;
  }, {}) || {};

  return (
    <div className="space-y-6">
      {["breakfast", "lunch", "dinner", "snack"].map((mealType) => (
        <Card key={mealType}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="capitalize">{mealType} Options</CardTitle>
              <Button
                size="sm"
                onClick={() => setSelectedMealType(mealType)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Options
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {groupedOptions[mealType] && groupedOptions[mealType].length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedOptions[mealType].map((option: any) => (
                  <div key={option.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{option.recipes?.name}</h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeOptionMutation.mutate(option.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {option.recipes?.calories} cal · P{option.recipes?.protein}g · C{option.recipes?.carbs}g · F{option.recipes?.fats}g
                    </p>
                    {option.recipes?.tags && option.recipes.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {option.recipes.tags.slice(0, 2).map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                No options added yet. Click "Add Options" to get started.
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      <SelectRecipesDialog
        open={!!selectedMealType}
        onOpenChange={(open) => !open && setSelectedMealType(null)}
        mealPlanId={mealPlanId}
        mealType={selectedMealType || "breakfast"}
        mode="flexible"
      />
    </div>
  );
}
