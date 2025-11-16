import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { SelectRecipesDialog } from "./SelectRecipesDialog";
import { format } from "date-fns";
import { toast } from "sonner";

interface StructuredMealPlanBuilderProps {
  mealPlanId: string;
}

export function StructuredMealPlanBuilder({ mealPlanId }: StructuredMealPlanBuilderProps) {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMealType, setSelectedMealType] = useState<string | null>(null);

  const { data: mealDays } = useQuery({
    queryKey: ["meal-plan-days", mealPlanId, format(selectedDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_plan_days")
        .select(`
          *,
          recipes (*)
        `)
        .eq("meal_plan_id", mealPlanId)
        .eq("plan_date", format(selectedDate, "yyyy-MM-dd"))
        .order("meal_type")
        .order("order_index");

      if (error) throw error;
      return data;
    },
    enabled: !!mealPlanId,
  });

  const removeMealMutation = useMutation({
    mutationFn: async (mealId: string) => {
      const { error } = await supabase
        .from("meal_plan_days")
        .delete()
        .eq("id", mealId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plan-days"] });
      toast.success("Meal removed");
    },
  });

  const groupedMeals = mealDays?.reduce((acc: any, meal: any) => {
    if (!acc[meal.meal_type]) acc[meal.meal_type] = [];
    acc[meal.meal_type].push(meal);
    return acc;
  }, {}) || {};

  return (
    <div className="grid gap-6 md:grid-cols-[300px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Select Date</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Meals for {format(selectedDate, "EEEE, MMM d")}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Add recipes for each meal type
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {["breakfast", "lunch", "dinner", "snack"].map((mealType) => (
          <Card key={mealType}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="capitalize">{mealType}</CardTitle>
                <Button
                  size="sm"
                  onClick={() => setSelectedMealType(mealType)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Recipe
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {groupedMeals[mealType] && groupedMeals[mealType].length > 0 ? (
                <div className="space-y-3">
                  {groupedMeals[mealType].map((meal: any) => (
                    <div key={meal.id} className="flex items-start gap-4 border rounded-lg p-3">
                      <div className="flex-1">
                        <h4 className="font-semibold">{meal.recipes?.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {meal.servings} serving{meal.servings > 1 ? "s" : ""} · 
                          {(meal.recipes?.calories * meal.servings).toFixed(0)} cal · 
                          P{(meal.recipes?.protein * meal.servings).toFixed(0)}g · 
                          C{(meal.recipes?.carbs * meal.servings).toFixed(0)}g · 
                          F{(meal.recipes?.fats * meal.servings).toFixed(0)}g
                        </p>
                        {meal.notes && (
                          <p className="text-sm text-muted-foreground mt-1 italic">
                            Note: {meal.notes}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeMealMutation.mutate(meal.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-6 text-muted-foreground text-sm">
                  No recipes added yet
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <SelectRecipesDialog
        open={!!selectedMealType}
        onOpenChange={(open) => !open && setSelectedMealType(null)}
        mealPlanId={mealPlanId}
        mealType={selectedMealType || "breakfast"}
        mode="structured"
        selectedDate={selectedDate}
      />
    </div>
  );
}
