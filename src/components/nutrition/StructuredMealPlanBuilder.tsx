import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronLeft, ChevronRight, Copy, Eye } from "lucide-react";
import { SelectRecipesDialog } from "./SelectRecipesDialog";
import { toast } from "sonner";

interface StructuredMealPlanBuilderProps {
  mealPlanId: string;
  numWeeks: number;
  onAddWeek: () => void;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DEFAULT_MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

export function StructuredMealPlanBuilder({ mealPlanId, numWeeks, onAddWeek }: StructuredMealPlanBuilderProps) {
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState(1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<string | null>(null);
  const [showDietaryInfo, setShowDietaryInfo] = useState(false);
  const [dayNote, setDayNote] = useState("");

  // Fetch meals for current week
  const { data: weekMeals } = useQuery({
    queryKey: ["structured-week-meals", mealPlanId, currentWeek],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_plan_days")
        .select("*, recipes (*)")
        .eq("meal_plan_id", mealPlanId)
        .eq("week_number", currentWeek)
        .order("day_of_week")
        .order("meal_type")
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!mealPlanId,
  });

  // Fetch notes for current week
  const { data: notes } = useQuery({
    queryKey: ["meal-plan-notes", mealPlanId, currentWeek],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_plan_notes")
        .select("*")
        .eq("meal_plan_id", mealPlanId)
        .eq("week_number", currentWeek);
      if (error) throw error;
      return data;
    },
    enabled: !!mealPlanId,
  });

  const removeMealMutation = useMutation({
    mutationFn: async (mealId: string) => {
      const { error } = await supabase.from("meal_plan_days").delete().eq("id", mealId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["structured-week-meals"] });
      toast.success("Recipe removed");
    },
  });

  const saveNoteMutation = useMutation({
    mutationFn: async ({ noteType, weekNum, dayOfWeek, content }: { noteType: string; weekNum: number; dayOfWeek?: number; content: string }) => {
      const existing = notes?.find(n => n.note_type === noteType && n.week_number === weekNum && n.day_of_week === dayOfWeek);
      if (existing) {
        const { error } = await supabase.from("meal_plan_notes").update({ content }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("meal_plan_notes").insert({
          meal_plan_id: mealPlanId,
          note_type: noteType,
          week_number: weekNum,
          day_of_week: dayOfWeek ?? null,
          content,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plan-notes"] });
      toast.success("Note saved");
    },
  });

  const copyWeekMutation = useMutation({
    mutationFn: async (targetWeek: number) => {
      if (!weekMeals || weekMeals.length === 0) return;
      const inserts = weekMeals.map((meal: any) => ({
        meal_plan_id: mealPlanId,
        plan_date: meal.plan_date,
        meal_type: meal.meal_type,
        recipe_id: meal.recipe_id,
        servings: meal.servings,
        order_index: meal.order_index,
        week_number: targetWeek,
        day_of_week: meal.day_of_week,
        notes: meal.notes,
      }));
      const { error } = await supabase.from("meal_plan_days").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["structured-week-meals"] });
      toast.success("Week copied!");
    },
  });

  // Group meals by day and meal type
  const getMealsByDayAndType = (dayIndex: number, mealType: string) => {
    return weekMeals?.filter((m: any) => m.day_of_week === dayIndex && m.meal_type === mealType) || [];
  };

  // Calculate daily nutrition
  const getDayNutrition = (dayIndex: number) => {
    const dayMeals = weekMeals?.filter((m: any) => m.day_of_week === dayIndex) || [];
    return {
      calories: dayMeals.reduce((sum: number, m: any) => sum + ((m.recipes?.calories || 0) * (m.servings || 1)), 0),
      protein: dayMeals.reduce((sum: number, m: any) => sum + ((m.recipes?.protein || 0) * (m.servings || 1)), 0),
      carbs: dayMeals.reduce((sum: number, m: any) => sum + ((m.recipes?.carbs || 0) * (m.servings || 1)), 0),
      fats: dayMeals.reduce((sum: number, m: any) => sum + ((m.recipes?.fats || 0) * (m.servings || 1)), 0),
    };
  };

  // Calculate weekly averages
  const getWeeklyAverages = () => {
    const daysWithMeals = DAYS.map((_, i) => getDayNutrition(i)).filter(d => d.calories > 0);
    if (daysWithMeals.length === 0) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    return {
      calories: Math.round(daysWithMeals.reduce((s, d) => s + d.calories, 0) / daysWithMeals.length),
      protein: Math.round(daysWithMeals.reduce((s, d) => s + d.protein, 0) / daysWithMeals.length),
      carbs: Math.round(daysWithMeals.reduce((s, d) => s + d.carbs, 0) / daysWithMeals.length),
      fats: Math.round(daysWithMeals.reduce((s, d) => s + d.fats, 0) / daysWithMeals.length),
    };
  };

  const weeklyAvg = getWeeklyAverages();
  const weekNote = notes?.find(n => n.note_type === "week" && n.week_number === currentWeek);

  // WEEK VIEW (no day selected)
  if (selectedDay === null) {
    return (
      <div className="space-y-4">
        {/* Week Navigation */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" disabled={currentWeek <= 1} onClick={() => setCurrentWeek(w => w - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-semibold">Week {currentWeek} of {numWeeks}</span>
                <Button variant="outline" size="icon" disabled={currentWeek >= numWeeks} onClick={() => setCurrentWeek(w => w + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onAddWeek}>
                  <Plus className="h-4 w-4 mr-1" /> Add Week
                </Button>
                {weekMeals && weekMeals.length > 0 && currentWeek < numWeeks && (
                  <Button variant="outline" size="sm" onClick={() => copyWeekMutation.mutate(currentWeek + 1)}>
                    <Copy className="h-4 w-4 mr-1" /> Copy to Next Week
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Nutrition Averages */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Weekly Nutrition Averages:</span>
              <div className="flex gap-4 text-sm">
                <span className="font-semibold">{weeklyAvg.calories} cal</span>
                <span>P {weeklyAvg.protein}g</span>
                <span>C {weeklyAvg.carbs}g</span>
                <span>F {weeklyAvg.fats}g</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Week Note */}
        <div className="flex items-center gap-2">
          <Textarea
            placeholder={`Leave a note for Week ${currentWeek}`}
            defaultValue={weekNote?.content || ""}
            className="text-sm"
            rows={1}
            onBlur={(e) => {
              if (e.target.value !== (weekNote?.content || "")) {
                saveNoteMutation.mutate({ noteType: "week", weekNum: currentWeek, content: e.target.value });
              }
            }}
          />
        </div>

        {/* Days Grid */}
        <div className="space-y-3">
          {DAYS.map((day, dayIndex) => {
            const dayNutrition = getDayNutrition(dayIndex);
            const dayMeals = weekMeals?.filter((m: any) => m.day_of_week === dayIndex) || [];

            return (
              <Card
                key={day}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedDay(dayIndex)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{day.toUpperCase()} (DAY {dayIndex + 1})</h3>
                    {dayNutrition.calories > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {Math.round(dayNutrition.calories)} cal · P {Math.round(dayNutrition.protein)}g · C {Math.round(dayNutrition.carbs)}g · F {Math.round(dayNutrition.fats)}g
                      </span>
                    )}
                  </div>

                  {dayMeals.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_MEAL_TYPES.map(mealType => {
                        const meals = getMealsByDayAndType(dayIndex, mealType);
                        if (meals.length === 0) return null;
                        return (
                          <div key={mealType} className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs capitalize">{mealType}</Badge>
                            {meals.map((meal: any) => (
                              <span key={meal.id} className="text-xs text-muted-foreground">
                                {meal.recipes?.name}
                                {meals.indexOf(meal) < meals.length - 1 ? ", " : ""}
                              </span>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No meals added · Click to add</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <SelectRecipesDialog
          open={!!selectedMealType}
          onOpenChange={(open) => !open && setSelectedMealType(null)}
          mealPlanId={mealPlanId}
          mealType={selectedMealType || "breakfast"}
          mode="structured"
          weekNumber={currentWeek}
          dayOfWeek={selectedDay ?? 0}
        />
      </div>
    );
  }

  // DAY VIEW
  const dayNutrition = getDayNutrition(selectedDay);
  const currentDayNote = notes?.find(n => n.note_type === "day" && n.week_number === currentWeek && n.day_of_week === selectedDay);

  return (
    <div className="space-y-4">
      {/* Back + Day Header */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <h2 className="font-semibold text-lg">{DAYS[selectedDay]}, Week {currentWeek}</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={showDietaryInfo} onCheckedChange={setShowDietaryInfo} id="dietary-toggle" />
                <Label htmlFor="dietary-toggle" className="text-sm">Show dietary info</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day Note */}
      <Textarea
        placeholder="Leave a note for this day"
        defaultValue={currentDayNote?.content || ""}
        className="text-sm"
        rows={1}
        onBlur={(e) => {
          if (e.target.value !== (currentDayNote?.content || "")) {
            saveNoteMutation.mutate({ noteType: "day", weekNum: currentWeek, dayOfWeek: selectedDay, content: e.target.value });
          }
        }}
      />

      {/* Daily Nutrition Total */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Daily Nutrition Total:</span>
            <span className="text-sm font-semibold">
              {Math.round(dayNutrition.calories)} cal · P {Math.round(dayNutrition.protein)}g · C {Math.round(dayNutrition.carbs)}g · F {Math.round(dayNutrition.fats)}g
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Meal Categories */}
      {DEFAULT_MEAL_TYPES.map(mealType => {
        const meals = getMealsByDayAndType(selectedDay, mealType);
        const categoryNutrition = meals.reduce(
          (acc: any, m: any) => ({
            calories: acc.calories + (m.recipes?.calories || 0) * (m.servings || 1),
            protein: acc.protein + (m.recipes?.protein || 0) * (m.servings || 1),
            carbs: acc.carbs + (m.recipes?.carbs || 0) * (m.servings || 1),
            fats: acc.fats + (m.recipes?.fats || 0) * (m.servings || 1),
          }),
          { calories: 0, protein: 0, carbs: 0, fats: 0 }
        );

        return (
          <Card key={mealType}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="capitalize text-base">{mealType} ({meals.length})</CardTitle>
                  {meals.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round(categoryNutrition.calories)} cal · P {Math.round(categoryNutrition.protein)}g · C {Math.round(categoryNutrition.carbs)}g · F {Math.round(categoryNutrition.fats)}g
                    </p>
                  )}
                </div>
                <Button size="sm" onClick={() => setSelectedMealType(mealType)}>
                  <Plus className="h-4 w-4 mr-1" /> Add Recipe
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {meals.length > 0 ? (
                <div className="space-y-2">
                  {meals.map((meal: any) => (
                    <div key={meal.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{meal.recipes?.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {meal.servings} serving{meal.servings > 1 ? "s" : ""} · {Math.round((meal.recipes?.calories || 0) * (meal.servings || 1))} cal · P {Math.round((meal.recipes?.protein || 0) * (meal.servings || 1))}g · C {Math.round((meal.recipes?.carbs || 0) * (meal.servings || 1))}g · F {Math.round((meal.recipes?.fats || 0) * (meal.servings || 1))}g
                        </p>
                        {showDietaryInfo && meal.recipes?.tags && meal.recipes.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {meal.recipes.tags.map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        )}
                        {meal.notes && <p className="text-xs text-muted-foreground mt-1 italic">Note: {meal.notes}</p>}
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeMealMutation.mutate(meal.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-sm text-muted-foreground">No recipes yet · Add from the right</p>
              )}
            </CardContent>
          </Card>
        );
      })}

      <SelectRecipesDialog
        open={!!selectedMealType}
        onOpenChange={(open) => !open && setSelectedMealType(null)}
        mealPlanId={mealPlanId}
        mealType={selectedMealType || "breakfast"}
        mode="structured"
        weekNumber={currentWeek}
        dayOfWeek={selectedDay}
      />
    </div>
  );
}
