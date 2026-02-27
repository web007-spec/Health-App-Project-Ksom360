import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface FlexibleMealPlanProps {
  assignmentId: string;
  mealPlanId: string;
}

export function FlexibleMealPlan({ assignmentId, mealPlanId }: FlexibleMealPlanProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

  // Fetch meal plan with flexible options
  const { data: mealPlan } = useQuery({
    queryKey: ["meal-plan", mealPlanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_plans")
        .select(`
          *,
          meal_plan_flexible_options (
            *,
            recipes (*)
          )
        `)
        .eq("id", mealPlanId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!mealPlanId,
  });

  // Fetch client's selections for the week
  const { data: selections } = useQuery({
    queryKey: ["client-meal-selections", user?.id, weekStart, weekEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_meal_selections")
        .select(`
          *,
          recipes (*)
        `)
        .eq("client_id", user?.id)
        .eq("assignment_id", assignmentId)
        .gte("meal_date", format(weekStart, "yyyy-MM-dd"))
        .lte("meal_date", format(weekEnd, "yyyy-MM-dd"));

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const selectMealMutation = useMutation({
    mutationFn: async ({ 
      recipeId, 
      mealType, 
      date 
    }: { 
      recipeId: string; 
      mealType: string; 
      date: Date;
    }) => {
      const { error } = await supabase
        .from("client_meal_selections")
        .insert([{
          client_id: user?.id!,
          assignment_id: assignmentId,
          recipe_id: recipeId,
          meal_type: mealType as any,
          meal_date: format(date, "yyyy-MM-dd"),
          servings: 1,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-meal-selections"] });
      toast.success("Meal selected!");
    },
    onError: () => {
      toast.error("Failed to select meal");
    },
  });

  const groupedOptions = mealPlan?.meal_plan_flexible_options?.reduce((acc: any, option: any) => {
    if (!acc[option.meal_type]) acc[option.meal_type] = [];
    acc[option.meal_type].push(option);
    return acc;
  }, {}) || {};

  const todaySelections = selections?.filter(
    s => s.meal_date === format(selectedDate, "yyyy-MM-dd")
  ) || [];

  const calculateDailyTotals = () => {
    return todaySelections.reduce(
      (acc, sel) => ({
        calories: acc.calories + (sel.recipes?.calories || 0),
        protein: acc.protein + (sel.recipes?.protein || 0),
        carbs: acc.carbs + (sel.recipes?.carbs || 0),
        fats: acc.fats + (sel.recipes?.fats || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  };

  const totals = calculateDailyTotals();
  const targets = {
    calories: mealPlan?.target_calories || 2000,
    protein: mealPlan?.target_protein || 150,
    carbs: mealPlan?.target_carbs || 200,
    fats: mealPlan?.target_fats || 60,
  };

  return (
    <div className="space-y-6">
      {/* Date selector */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <h3 className="font-semibold text-lg">{format(selectedDate, "EEEE")}</h3>
              <p className="text-sm text-muted-foreground">{format(selectedDate, "MMM d, yyyy")}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Daily nutrition totals */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Calories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.calories}</div>
            <Progress value={(totals.calories / targets.calories) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">of {targets.calories} cal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Protein</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.protein.toFixed(0)}g</div>
            <Progress value={(totals.protein / targets.protein) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">of {targets.protein}g</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Carbs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.carbs.toFixed(0)}g</div>
            <Progress value={(totals.carbs / targets.carbs) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">of {targets.carbs}g</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Fats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.fats.toFixed(0)}g</div>
            <Progress value={(totals.fats / targets.fats) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">of {targets.fats}g</p>
          </CardContent>
        </Card>
      </div>

      {/* Meal options by meal type */}
      {["breakfast", "lunch", "dinner", "snack"].map((mealType) => {
        const options = groupedOptions[mealType] || [];
        const selected = todaySelections.find(s => s.meal_type === mealType);

        if (options.length === 0) return null;

        return (
          <Card key={mealType}>
            <CardHeader>
              <CardTitle className="capitalize">{mealType} Options</CardTitle>
            </CardHeader>
            <CardContent>
              {selected ? (
                <div className="p-4 border rounded-lg bg-primary/5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{selected.recipes?.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selected.recipes?.calories} cal · P{selected.recipes?.protein}g · C{selected.recipes?.carbs}g · F{selected.recipes?.fats}g
                      </p>
                    </div>
                    <Badge>Selected</Badge>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {options.map((option: any) => (
                    <Card key={option.id} className="cursor-pointer hover:border-primary transition-colors">
                      <CardContent className="p-4">
                        {option.recipes?.image_url && (
                          <img 
                            src={option.recipes.image_url} 
                            alt={option.recipes.name}
                            className="w-full h-32 object-cover rounded-md mb-3"
                          />
                        )}
                        <h4 className="font-semibold mb-2">{option.recipes?.name}</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          {option.recipes?.calories} cal · P{option.recipes?.protein}g · C{option.recipes?.carbs}g · F{option.recipes?.fats}g
                        </p>
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => selectMealMutation.mutate({
                            recipeId: option.recipe_id,
                            mealType,
                            date: selectedDate,
                          })}
                        >
                          Select
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
