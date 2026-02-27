import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { SelectRecipesDialog } from "./SelectRecipesDialog";
import { toast } from "sonner";

interface FlexibleMealPlanBuilderProps {
  mealPlanId: string;
  numWeeks: number;
  onAddWeek: () => void;
}

const DEFAULT_MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
const MAX_OPTIONS = 7;

export function FlexibleMealPlanBuilder({ mealPlanId, numWeeks, onAddWeek }: FlexibleMealPlanBuilderProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState(1);
  const [selectedMealType, setSelectedMealType] = useState<string | null>(null);

  const { data: options } = useQuery({
    queryKey: ["flexible-week-options", mealPlanId, currentWeek],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_plan_flexible_options")
        .select("*, recipes (*)")
        .eq("meal_plan_id", mealPlanId)
        .eq("week_number", currentWeek)
        .order("meal_type")
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!mealPlanId,
  });

  const { data: notes } = useQuery({
    queryKey: ["meal-plan-notes", mealPlanId, currentWeek],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_plan_notes")
        .select("*")
        .eq("meal_plan_id", mealPlanId)
        .eq("week_number", currentWeek)
        .eq("note_type", "week");
      if (error) throw error;
      return data;
    },
    enabled: !!mealPlanId,
  });

  const removeOptionMutation = useMutation({
    mutationFn: async (optionId: string) => {
      const { error } = await supabase.from("meal_plan_flexible_options").delete().eq("id", optionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flexible-week-options"] });
      toast.success("Option removed");
    },
  });

  const saveNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const existing = notes?.[0];
      if (existing) {
        const { error } = await supabase.from("meal_plan_notes").update({ content }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("meal_plan_notes").insert({
          meal_plan_id: mealPlanId,
          note_type: "week",
          week_number: currentWeek,
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
      if (!options || options.length === 0) return;
      const inserts = options.map((opt: any) => ({
        meal_plan_id: mealPlanId,
        meal_type: opt.meal_type,
        recipe_id: opt.recipe_id,
        order_index: opt.order_index,
        week_number: targetWeek,
      }));
      const { error } = await supabase.from("meal_plan_flexible_options").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flexible-week-options"] });
      toast.success("Week copied!");
    },
  });

  const getOptionsByType = (mealType: string) => {
    return options?.filter((o: any) => o.meal_type === mealType) || [];
  };

  // Calculate weekly nutrition averages across all options
  const getWeeklyAverages = () => {
    const allOptions = options || [];
    if (allOptions.length === 0) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    
    // Average per meal type, then sum across types
    const perType = DEFAULT_MEAL_TYPES.map(type => {
      const typeOptions = allOptions.filter((o: any) => o.meal_type === type);
      if (typeOptions.length === 0) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
      return {
        calories: typeOptions.reduce((s: number, o: any) => s + (o.recipes?.calories || 0), 0) / typeOptions.length,
        protein: typeOptions.reduce((s: number, o: any) => s + (o.recipes?.protein || 0), 0) / typeOptions.length,
        carbs: typeOptions.reduce((s: number, o: any) => s + (o.recipes?.carbs || 0), 0) / typeOptions.length,
        fats: typeOptions.reduce((s: number, o: any) => s + (o.recipes?.fats || 0), 0) / typeOptions.length,
      };
    });

    return {
      calories: Math.round(perType.reduce((s, t) => s + t.calories, 0)),
      protein: Math.round(perType.reduce((s, t) => s + t.protein, 0)),
      carbs: Math.round(perType.reduce((s, t) => s + t.carbs, 0)),
      fats: Math.round(perType.reduce((s, t) => s + t.fats, 0)),
    };
  };

  const weeklyAvg = getWeeklyAverages();
  const weekNote = notes?.[0];

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
              {options && options.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => copyWeekMutation.mutate(currentWeek < numWeeks ? currentWeek + 1 : currentWeek)}>
                  <Copy className="h-4 w-4 mr-1" /> Copy Week
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
      <Textarea
        placeholder={`Leave a note for Week ${currentWeek}`}
        defaultValue={weekNote?.content || ""}
        className="text-sm"
        rows={1}
        onBlur={(e) => {
          if (e.target.value !== (weekNote?.content || "")) {
            saveNoteMutation.mutate(e.target.value);
          }
        }}
      />

      {/* Meal Categories */}
      {DEFAULT_MEAL_TYPES.map(mealType => {
        const typeOptions = getOptionsByType(mealType);
        const avgNutrition = typeOptions.length > 0 ? {
          calories: Math.round(typeOptions.reduce((s: number, o: any) => s + (o.recipes?.calories || 0), 0) / typeOptions.length),
          protein: Math.round(typeOptions.reduce((s: number, o: any) => s + (o.recipes?.protein || 0), 0) / typeOptions.length),
          carbs: Math.round(typeOptions.reduce((s: number, o: any) => s + (o.recipes?.carbs || 0), 0) / typeOptions.length),
          fats: Math.round(typeOptions.reduce((s: number, o: any) => s + (o.recipes?.fats || 0), 0) / typeOptions.length),
        } : null;

        return (
          <Card key={mealType}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="capitalize text-base">{mealType} Options</CardTitle>
                  {avgNutrition && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {avgNutrition.calories} cal avg. · P {avgNutrition.protein}g · C {avgNutrition.carbs}g · F {avgNutrition.fats}g
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{typeOptions.length}/{MAX_OPTIONS}</span>
                  <Button
                    size="sm"
                    onClick={() => setSelectedMealType(mealType)}
                    disabled={typeOptions.length >= MAX_OPTIONS}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Options
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {typeOptions.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {typeOptions.map((option: any) => (
                    <div key={option.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-semibold text-sm leading-tight">{option.recipes?.name}</h4>
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => removeOptionMutation.mutate(option.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {option.recipes?.calories} cal · P{option.recipes?.protein}g · C{option.recipes?.carbs}g · F{option.recipes?.fats}g
                      </p>
                      {option.recipes?.tags && option.recipes.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {option.recipes.tags.slice(0, 3).map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-6 text-muted-foreground text-sm">
                  No options added yet. Add up to {MAX_OPTIONS} recipe options.
                </p>
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
        mode="flexible"
        weekNumber={currentWeek}
      />
    </div>
  );
}
