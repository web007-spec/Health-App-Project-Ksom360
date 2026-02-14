import { useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from "date-fns";
import { ChevronLeft, ChevronRight, UtensilsCrossed, Check, BookOpen, Flame } from "lucide-react";
import { toast } from "sonner";

export default function ClientMealPlan() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Fetch active assignment
  const { data: assignment } = useQuery({
    queryKey: ["client-meal-assignment", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_meal_plan_assignments")
        .select(`*, meal_plans (*)`)
        .eq("client_id", user?.id)
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const mealPlan = assignment?.meal_plans;
  const isFlexible = mealPlan?.plan_type === "flexible";

  // Fetch structured meals for the week
  const { data: structuredMeals } = useQuery({
    queryKey: ["client-structured-meals", assignment?.meal_plan_id, currentDate.toISOString()],
    queryFn: async () => {
      // Calculate which week number this is based on assignment start_date
      const startDate = new Date(assignment!.start_date);
      const diffWeeks = Math.floor((weekStart.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const weekNum = Math.max(1, diffWeeks + 1);

      const { data, error } = await supabase
        .from("meal_plan_days")
        .select("*, recipes (*)")
        .eq("meal_plan_id", assignment!.meal_plan_id)
        .eq("week_number", weekNum)
        .order("day_of_week")
        .order("meal_type")
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!assignment?.meal_plan_id && !isFlexible,
  });

  // Fetch flexible options
  const { data: flexibleOptions } = useQuery({
    queryKey: ["client-flexible-options", assignment?.meal_plan_id, currentDate.toISOString()],
    queryFn: async () => {
      const startDate = new Date(assignment!.start_date);
      const diffWeeks = Math.floor((weekStart.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const weekNum = Math.max(1, diffWeeks + 1);

      const { data, error } = await supabase
        .from("meal_plan_flexible_options")
        .select("*, recipes (*)")
        .eq("meal_plan_id", assignment!.meal_plan_id)
        .eq("week_number", weekNum)
        .order("meal_type")
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!assignment?.meal_plan_id && isFlexible,
  });

  // Fetch client selections (logged meals)
  const { data: selections } = useQuery({
    queryKey: ["client-meal-selections", user?.id, weekStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_meal_selections")
        .select("*, recipes (*)")
        .eq("client_id", user?.id)
        .gte("meal_date", format(weekStart, "yyyy-MM-dd"))
        .lte("meal_date", format(weekEnd, "yyyy-MM-dd"));
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch recipe books
  const { data: recipeBookAssignments } = useQuery({
    queryKey: ["client-recipe-books", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_recipe_book_assignments")
        .select("*, recipe_books (*, recipe_book_recipes (*, recipes (*)))")
        .eq("client_id", user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Log a meal
  const logMealMutation = useMutation({
    mutationFn: async ({ recipeId, mealType, mealDate, servings }: { recipeId: string; mealType: string; mealDate: string; servings: number }) => {
      const { error } = await supabase.from("client_meal_selections").insert({
        client_id: user?.id!,
        recipe_id: recipeId,
        meal_type: mealType as any,
        meal_date: mealDate,
        assignment_id: assignment?.id,
        servings,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-meal-selections"] });
      toast.success("Meal logged!");
    },
  });

  // Unlog a meal
  const unlogMealMutation = useMutation({
    mutationFn: async (selectionId: string) => {
      const { error } = await supabase.from("client_meal_selections").delete().eq("id", selectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-meal-selections"] });
      toast.success("Meal unlogged");
    },
  });

  const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

  // Calculate nutrition for selections on a given date
  const getDaySelectionNutrition = (dateStr: string) => {
    const daySelections = selections?.filter(s => s.meal_date === dateStr) || [];
    return {
      calories: daySelections.reduce((sum, s) => sum + ((s.recipes?.calories || 0) * (s.servings || 1)), 0),
      protein: daySelections.reduce((sum, s) => sum + ((s.recipes?.protein || 0) * (s.servings || 1)), 0),
      carbs: daySelections.reduce((sum, s) => sum + ((s.recipes?.carbs || 0) * (s.servings || 1)), 0),
      fats: daySelections.reduce((sum, s) => sum + ((s.recipes?.fats || 0) * (s.servings || 1)), 0),
    };
  };

  // Weekly averages from selections
  const getWeeklyAverages = () => {
    const daysWithData = weekDays.map(d => getDaySelectionNutrition(format(d, "yyyy-MM-dd"))).filter(d => d.calories > 0);
    if (daysWithData.length === 0) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    return {
      calories: Math.round(daysWithData.reduce((s, d) => s + d.calories, 0) / daysWithData.length),
      protein: Math.round(daysWithData.reduce((s, d) => s + d.protein, 0) / daysWithData.length),
      carbs: Math.round(daysWithData.reduce((s, d) => s + d.carbs, 0) / daysWithData.length),
      fats: Math.round(daysWithData.reduce((s, d) => s + d.fats, 0) / daysWithData.length),
    };
  };

  const weeklyAvg = getWeeklyAverages();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  if (!assignment) {
    return (
      <ClientLayout>
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <UtensilsCrossed className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Meal Plan Assigned</h3>
              <p className="text-muted-foreground">Your coach hasn't assigned a meal plan yet.</p>
            </CardContent>
          </Card>

          {/* Recipe Books */}
          {recipeBookAssignments && recipeBookAssignments.length > 0 && (
            <div className="mt-6 space-y-4">
              <h2 className="text-xl font-bold">Recipe Books</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recipeBookAssignments.map((rba: any) => (
                  <Card key={rba.id} className="hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-8 w-8 text-primary" />
                        <div>
                          <h4 className="font-semibold">{rba.recipe_books?.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {rba.recipe_books?.recipe_book_recipes?.length || 0} recipes
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Meal Plan</h1>
            <p className="text-muted-foreground mt-1">{mealPlan?.name}</p>
          </div>
          <Badge variant="outline" className="capitalize">{mealPlan?.plan_type} Plan</Badge>
        </div>

        {/* Week Navigation */}
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-sm">
                {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Nutrition Summary */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Weekly Nutrition {isFlexible ? "Averages" : "Total"}</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold">{weeklyAvg.calories}</div>
                <div className="text-xs text-muted-foreground">
                  {mealPlan?.target_calories ? `/ ${mealPlan.target_calories}` : ""} cal
                </div>
                {mealPlan?.target_calories && (
                  <Progress value={Math.min((weeklyAvg.calories / mealPlan.target_calories) * 100, 100)} className="h-1 mt-1" />
                )}
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{weeklyAvg.protein}g</div>
                <div className="text-xs text-muted-foreground">
                  {mealPlan?.target_protein ? `/ ${mealPlan.target_protein}g` : ""} Protein
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{weeklyAvg.carbs}g</div>
                <div className="text-xs text-muted-foreground">
                  {mealPlan?.target_carbs ? `/ ${mealPlan.target_carbs}g` : ""} Carbs
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{weeklyAvg.fats}g</div>
                <div className="text-xs text-muted-foreground">
                  {mealPlan?.target_fats ? `/ ${mealPlan.target_fats}g` : ""} Fat
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Flexible Meal Plan View */}
        {isFlexible && (
          <div className="space-y-4">
            {MEAL_TYPES.map(mealType => {
              const typeOptions = flexibleOptions?.filter((o: any) => o.meal_type === mealType) || [];
              if (typeOptions.length === 0) return null;

              return (
                <Card key={mealType}>
                  <CardHeader className="pb-2">
                    <CardTitle className="capitalize text-base">{mealType} Options</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {typeOptions.map((option: any) => {
                        const isLogged = selections?.some(
                          s => s.recipe_id === option.recipe_id && s.meal_type === mealType && s.meal_date === todayStr
                        );

                        return (
                          <div key={option.id} className={`border rounded-lg p-3 ${isLogged ? "border-primary bg-primary/5" : ""}`}>
                            <div className="flex items-start justify-between mb-1">
                              <h4 className="font-semibold text-sm leading-tight">{option.recipes?.name}</h4>
                              {isLogged && <Check className="h-4 w-4 text-primary shrink-0" />}
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {option.recipes?.calories} cal · P{option.recipes?.protein}g · C{option.recipes?.carbs}g · F{option.recipes?.fats}g
                            </p>
                            {option.recipes?.tags && option.recipes.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {option.recipes.tags.slice(0, 2).map((tag: string) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                                ))}
                              </div>
                            )}
                            {isLogged ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-xs"
                                onClick={() => {
                                  const sel = selections?.find(
                                    s => s.recipe_id === option.recipe_id && s.meal_type === mealType && s.meal_date === todayStr
                                  );
                                  if (sel) unlogMealMutation.mutate(sel.id);
                                }}
                              >
                                Unlog Meal
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="w-full text-xs"
                                onClick={() => logMealMutation.mutate({
                                  recipeId: option.recipe_id,
                                  mealType,
                                  mealDate: todayStr,
                                  servings: 1,
                                })}
                              >
                                <Flame className="h-3 w-3 mr-1" /> Log Meal
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Structured Meal Plan View */}
        {!isFlexible && (
          <Tabs defaultValue="week">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="week">Week View</TabsTrigger>
              <TabsTrigger value="day">Day View</TabsTrigger>
            </TabsList>

            <TabsContent value="week" className="space-y-3 mt-4">
              {weekDays.map((day, dayIndex) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const dayMeals = structuredMeals?.filter((m: any) => m.day_of_week === dayIndex) || [];
                const dayNutrition = getDaySelectionNutrition(dateStr);
                const isToday = dateStr === todayStr;

                return (
                  <Card key={dayIndex} className={isToday ? "border-primary" : ""}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">
                            {format(day, "EEEE")}
                            {isToday && <Badge className="ml-2 text-xs">Today</Badge>}
                          </h3>
                        </div>
                        {dayNutrition.calories > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {Math.round(dayNutrition.calories)} cal logged
                          </span>
                        )}
                      </div>
                      {dayMeals.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {dayMeals.map((meal: any) => {
                            const isLogged = selections?.some(
                              s => s.recipe_id === meal.recipe_id && s.meal_date === dateStr
                            );
                            return (
                              <div key={meal.id} className="flex items-center gap-1">
                                <Badge variant={isLogged ? "default" : "outline"} className="text-xs">
                                  {isLogged && <Check className="h-3 w-3 mr-1" />}
                                  {meal.recipes?.name}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No meals assigned</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="day" className="space-y-4 mt-4">
              {/* Day selector */}
              <div className="flex gap-1 overflow-x-auto pb-2">
                {weekDays.map((day, i) => (
                  <Button
                    key={i}
                    variant={selectedDayIndex === i || (selectedDayIndex === null && format(day, "yyyy-MM-dd") === todayStr) ? "default" : "outline"}
                    size="sm"
                    className="flex-shrink-0"
                    onClick={() => setSelectedDayIndex(i)}
                  >
                    {format(day, "EEE d")}
                  </Button>
                ))}
              </div>

              {(() => {
                const activeDayIndex = selectedDayIndex ?? weekDays.findIndex(d => format(d, "yyyy-MM-dd") === todayStr);
                const activeDay = weekDays[activeDayIndex >= 0 ? activeDayIndex : 0];
                const dateStr = format(activeDay, "yyyy-MM-dd");
                const dayMeals = structuredMeals?.filter((m: any) => m.day_of_week === (activeDayIndex >= 0 ? activeDayIndex : 0)) || [];
                const dayNutrition = getDaySelectionNutrition(dateStr);

                return (
                  <>
                    {/* Daily nutrition total */}
                    <Card>
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Daily Nutrition Total</span>
                          <span className="text-sm">
                            {Math.round(dayNutrition.calories)} cal · P {Math.round(dayNutrition.protein)}g · C {Math.round(dayNutrition.carbs)}g · F {Math.round(dayNutrition.fats)}g
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {MEAL_TYPES.map(mealType => {
                      const meals = dayMeals.filter((m: any) => m.meal_type === mealType);
                      if (meals.length === 0) return null;

                      return (
                        <Card key={mealType}>
                          <CardHeader className="pb-2">
                            <CardTitle className="capitalize text-base">{mealType}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {meals.map((meal: any) => {
                              const isLogged = selections?.some(
                                s => s.recipe_id === meal.recipe_id && s.meal_type === mealType && s.meal_date === dateStr
                              );

                              return (
                                <div key={meal.id} className={`border rounded-lg p-3 ${isLogged ? "border-primary bg-primary/5" : ""}`}>
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h4 className="font-semibold text-sm">{meal.recipes?.name}</h4>
                                      <p className="text-xs text-muted-foreground">
                                        {meal.servings} serving{meal.servings > 1 ? "s" : ""} · {Math.round((meal.recipes?.calories || 0) * (meal.servings || 1))} cal · P {Math.round((meal.recipes?.protein || 0) * (meal.servings || 1))}g · C {Math.round((meal.recipes?.carbs || 0) * (meal.servings || 1))}g · F {Math.round((meal.recipes?.fats || 0) * (meal.servings || 1))}g
                                      </p>
                                      {meal.recipes?.tags && meal.recipes.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {meal.recipes.tags.map((tag: string) => (
                                            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      {isLogged ? (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            const sel = selections?.find(
                                              s => s.recipe_id === meal.recipe_id && s.meal_type === mealType && s.meal_date === dateStr
                                            );
                                            if (sel) unlogMealMutation.mutate(sel.id);
                                          }}
                                        >
                                          Unlog
                                        </Button>
                                      ) : (
                                        <Button
                                          size="sm"
                                          onClick={() => logMealMutation.mutate({
                                            recipeId: meal.recipe_id,
                                            mealType,
                                            mealDate: dateStr,
                                            servings: meal.servings || 1,
                                          })}
                                        >
                                          Log Meal
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </>
                );
              })()}
            </TabsContent>
          </Tabs>
        )}

        {/* Recipe Books Section */}
        {recipeBookAssignments && recipeBookAssignments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Recipe Books
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {recipeBookAssignments.map((rba: any) => (
                  <div key={rba.id} className="border rounded-lg p-3">
                    <h4 className="font-semibold text-sm">{rba.recipe_books?.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {rba.recipe_books?.recipe_book_recipes?.length || 0} recipes
                    </p>
                    {rba.recipe_books?.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{rba.recipe_books.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}
