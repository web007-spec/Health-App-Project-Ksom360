import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface StructuredMealPlanProps {
  assignmentId: string;
  mealPlanId: string;
}

export function StructuredMealPlan({ assignmentId, mealPlanId }: StructuredMealPlanProps) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week">("day");
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

  // Fetch meal plan
  const { data: mealPlan } = useQuery({
    queryKey: ["meal-plan", mealPlanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("id", mealPlanId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!mealPlanId,
  });

  // Fetch structured meal plan days
  const { data: mealDays } = useQuery({
    queryKey: ["meal-plan-days", mealPlanId, weekStart, weekEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_plan_days")
        .select(`
          *,
          recipes (*)
        `)
        .eq("meal_plan_id", mealPlanId)
        .gte("plan_date", format(weekStart, "yyyy-MM-dd"))
        .lte("plan_date", format(weekEnd, "yyyy-MM-dd"))
        .order("plan_date")
        .order("order_index");

      if (error) throw error;
      return data || [];
    },
    enabled: !!mealPlanId,
  });

  const groupByDate = () => {
    return mealDays?.reduce((acc: any, day: any) => {
      if (!acc[day.plan_date]) acc[day.plan_date] = [];
      acc[day.plan_date].push(day);
      return acc;
    }, {}) || {};
  };

  const groupByMealType = (date: string) => {
    const daysForDate = mealDays?.filter(d => d.plan_date === date) || [];
    return daysForDate.reduce((acc: any, day: any) => {
      if (!acc[day.meal_type]) acc[day.meal_type] = [];
      acc[day.meal_type].push(day);
      return acc;
    }, {});
  };

  const calculateDailyTotals = (date: string) => {
    const daysForDate = mealDays?.filter(d => d.plan_date === date) || [];
    return daysForDate.reduce(
      (acc, day) => ({
        calories: acc.calories + ((day.recipes?.calories || 0) * (day.servings || 1)),
        protein: acc.protein + ((day.recipes?.protein || 0) * (day.servings || 1)),
        carbs: acc.carbs + ((day.recipes?.carbs || 0) * (day.servings || 1)),
        fats: acc.fats + ((day.recipes?.fats || 0) * (day.servings || 1)),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  };

  const targets = {
    calories: mealPlan?.target_calories || 2000,
    protein: mealPlan?.target_protein || 150,
    carbs: mealPlan?.target_carbs || 200,
    fats: mealPlan?.target_fats || 60,
  };

  const renderDayView = () => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const mealsGrouped = groupByMealType(dateStr);
    const totals = calculateDailyTotals(dateStr);

    return (
      <div className="space-y-6">
        {/* Daily nutrition totals */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Calories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.calories.toFixed(0)}</div>
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

        {/* Meals by type */}
        {["breakfast", "lunch", "dinner", "snack"].map((mealType) => {
          const meals = mealsGrouped[mealType] || [];
          if (meals.length === 0) return null;

          return (
            <Card key={mealType}>
              <CardHeader>
                <CardTitle className="capitalize">{mealType}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {meals.map((meal: any) => (
                  <div key={meal.id} className="flex items-start gap-4 p-3 border rounded-lg">
                    {meal.recipes?.image_url && (
                      <img 
                        src={meal.recipes.image_url} 
                        alt={meal.recipes.name}
                        className="w-20 h-20 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold">{meal.recipes?.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {meal.servings} serving{meal.servings > 1 ? "s" : ""}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {(meal.recipes?.calories * meal.servings).toFixed(0)} cal · 
                        P{(meal.recipes?.protein * meal.servings).toFixed(0)}g · 
                        C{(meal.recipes?.carbs * meal.servings).toFixed(0)}g · 
                        F{(meal.recipes?.fats * meal.servings).toFixed(0)}g
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    
    return (
      <div className="space-y-4">
        {weekDays.map(day => {
          const dateStr = format(day, "yyyy-MM-dd");
          const totals = calculateDailyTotals(dateStr);
          const mealsGrouped = groupByMealType(dateStr);
          const mealCount = Object.values(mealsGrouped).flat().length;

          return (
            <Card key={dateStr}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{format(day, "EEEE")}</CardTitle>
                    <p className="text-sm text-muted-foreground">{format(day, "MMM d")}</p>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-semibold">{totals.calories.toFixed(0)} cal</div>
                    <div className="text-muted-foreground">{mealCount} meals</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Protein:</span> {totals.protein.toFixed(0)}g
                  </div>
                  <div>
                    <span className="text-muted-foreground">Carbs:</span> {totals.carbs.toFixed(0)}g
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fats:</span> {totals.fats.toFixed(0)}g
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const days = view === "day" ? 1 : 7;
                setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - days)));
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <h3 className="font-semibold text-lg">
                {view === "day" 
                  ? format(selectedDate, "EEEE, MMM d")
                  : `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`
                }
              </h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const days = view === "day" ? 1 : 7;
                setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + days)));
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Tabs value={view} onValueChange={(v) => setView(v as "day" | "week")} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="day">Day View</TabsTrigger>
              <TabsTrigger value="week">Week View</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {view === "day" ? renderDayView() : renderWeekView()}
    </div>
  );
}
