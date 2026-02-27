import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight, UtensilsCrossed, Flame, BookOpen } from "lucide-react";

export default function ClientMealPlan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

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

  // Fetch flexible options for current week
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

  // Fetch structured meals
  const { data: structuredMeals } = useQuery({
    queryKey: ["client-structured-meals", assignment?.meal_plan_id, currentDate.toISOString()],
    queryFn: async () => {
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

  const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
  const mealOptions = isFlexible ? flexibleOptions : structuredMeals;

  // Group by meal type
  const getMealsForType = (type: string) => {
    if (!mealOptions) return [];
    if (isFlexible) {
      return mealOptions.filter((o: any) => o.meal_type === type);
    }
    // For structured, get unique recipes across all days for this type
    const seen = new Set<string>();
    return mealOptions.filter((m: any) => {
      if (m.meal_type !== type || seen.has(m.recipe_id)) return false;
      seen.add(m.recipe_id);
      return true;
    });
  };

  // Calculate weekly nutrition averages from options
  const getWeeklyAverages = () => {
    if (!mealOptions || mealOptions.length === 0) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    const allRecipes = mealOptions.map((o: any) => o.recipes).filter(Boolean);
    if (allRecipes.length === 0) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    return {
      calories: Math.round(allRecipes.reduce((s: number, r: any) => s + (r.calories || 0), 0) / Math.max(allRecipes.length / MEAL_TYPES.length, 1)),
      protein: Math.round(allRecipes.reduce((s: number, r: any) => s + Number(r.protein || 0), 0) / Math.max(allRecipes.length / MEAL_TYPES.length, 1)),
      carbs: Math.round(allRecipes.reduce((s: number, r: any) => s + Number(r.carbs || 0), 0) / Math.max(allRecipes.length / MEAL_TYPES.length, 1)),
      fats: Math.round(allRecipes.reduce((s: number, r: any) => s + Number(r.fats || 0), 0) / Math.max(allRecipes.length / MEAL_TYPES.length, 1)),
    };
  };

  const weeklyAvg = getWeeklyAverages();

  if (!assignment) {
    return (
      <ClientLayout>
        <div className="p-4 pb-24">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Meal Plan</h1>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <UtensilsCrossed className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Meal Plan Assigned</h3>
              <p className="text-muted-foreground text-sm">Your coach hasn't assigned a meal plan yet.</p>
            </CardContent>
          </Card>

          {/* Recipe Books fallback */}
          {recipeBookAssignments && recipeBookAssignments.length > 0 && (
            <div className="mt-6 space-y-4">
              <h2 className="text-xl font-bold">Recipe Books</h2>
              {recipeBookAssignments.map((rba: any) => (
                <Card key={rba.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <BookOpen className="h-8 w-8 text-primary" />
                    <div>
                      <h4 className="font-semibold">{rba.recipe_books?.name}</h4>
                      <p className="text-xs text-muted-foreground">{rba.recipe_books?.recipe_book_recipes?.length || 0} recipes</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="pb-24">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>

        <div className="px-4">
          <h1 className="text-2xl font-bold text-foreground">Meal Plan</h1>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-center gap-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">This Week</p>
            <p className="text-sm font-medium text-foreground">
              📅 {format(weekStart, "MMM dd")} - {format(weekEnd, "MMM dd")}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Weekly Nutrition Averages */}
        <div className="px-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold text-sm">Weekly Nutrition Averages</h3>
              </div>
              <div className="grid grid-cols-4 gap-3 text-center">
                <div>
                  <p className="font-bold text-xl">{weeklyAvg.calories}<span className="text-xs font-normal text-muted-foreground ml-0.5">cal</span></p>
                  <p className="text-xs text-muted-foreground">Calories</p>
                </div>
                <div>
                  <p className="font-bold text-xl">{weeklyAvg.protein}<span className="text-xs font-normal text-muted-foreground ml-0.5">g</span></p>
                  <p className="text-xs text-muted-foreground">Protein</p>
                </div>
                <div>
                  <p className="font-bold text-xl">{weeklyAvg.carbs}<span className="text-xs font-normal text-muted-foreground ml-0.5">g</span></p>
                  <p className="text-xs text-muted-foreground">Carbs</p>
                </div>
                <div>
                  <p className="font-bold text-xl">{weeklyAvg.fats}<span className="text-xs font-normal text-muted-foreground ml-0.5">g</span></p>
                  <p className="text-xs text-muted-foreground">Fat</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Meal Type Sections */}
        <div className="space-y-4 mt-4">
          {MEAL_TYPES.map((type) => {
            const meals = getMealsForType(type);
            if (meals.length === 0) return null;

            return (
              <div key={type} className="px-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-base capitalize">{type} options</h3>
                      <Flame className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                      {meals.map((option: any) => {
                        const recipe = option.recipes;
                        if (!recipe) return null;
                        return (
                          <div
                            key={option.id}
                            className="flex-shrink-0 w-44 cursor-pointer"
                            onClick={() => navigate(`/client/recipes/${recipe.id}`)}
                          >
                            {recipe.image_url ? (
                              <img
                                src={recipe.image_url}
                                alt={recipe.name}
                                className="w-44 h-32 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-44 h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center">
                                <UtensilsCrossed className="h-8 w-8 text-primary/40" />
                              </div>
                            )}
                            <h4 className="font-semibold text-sm mt-2 line-clamp-1">{recipe.name}</h4>
                            {recipe.tags && recipe.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {recipe.tags.slice(0, 2).map((tag: string) => (
                                  <span key={tag} className="text-[10px] text-primary font-medium">{tag}</span>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {recipe.calories} Cal • P {Number(recipe.protein || 0)}g • C {Number(recipe.carbs || 0)}g • F {Number(recipe.fats || 0)}g
                            </p>
                            <Badge variant="outline" className="text-[10px] mt-1">{recipe.servings || 1} SERVINGS</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Recipe Books */}
        {recipeBookAssignments && recipeBookAssignments.length > 0 && (
          <div className="px-4 mt-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                  <BookOpen className="h-5 w-5" /> Recipe Books
                </h3>
                <div className="space-y-2">
                  {recipeBookAssignments.map((rba: any) => (
                    <div key={rba.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent">
                      <BookOpen className="h-6 w-6 text-primary" />
                      <div>
                        <h4 className="font-semibold text-sm">{rba.recipe_books?.name}</h4>
                        <p className="text-xs text-muted-foreground">{rba.recipe_books?.recipe_book_recipes?.length || 0} recipes</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
