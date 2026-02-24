import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { UtensilsCrossed, Sparkles, Loader2, Copy, Check, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIMealPlanPanelProps {
  clientId: string;
  trainerId: string;
}

export function AIMealPlanPanel({ clientId, trainerId }: AIMealPlanPanelProps) {
  const [days, setDays] = useState("7");
  const [mealsPerDay, setMealsPerDay] = useState("3");
  const [mealGoal, setMealGoal] = useState("balanced nutrition");
  const [restrictions, setRestrictions] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);

  const { data: contextData } = useQuery({
    queryKey: ["ai-mp-context", clientId],
    queryFn: async () => {
      const { data: settings } = await supabase
        .from("client_feature_settings")
        .select("engine_mode, current_level")
        .eq("client_id", clientId)
        .maybeSingle();
      return {
        engine_mode: settings?.engine_mode || "performance",
        current_level: settings?.current_level || 1,
      };
    },
  });

  const { data: macroTargets } = useQuery({
    queryKey: ["ai-mp-macros", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_macro_targets")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
  });

  const { data: recipes } = useQuery({
    queryKey: ["ai-mp-recipes", trainerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("recipes")
        .select("id, name, calories, protein, carbs, fats, tags")
        .eq("trainer_id", trainerId)
        .limit(100);
      return data || [];
    },
  });

  const handleGenerate = async () => {
    if (!recipes?.length) {
      toast.error("No recipes found. Add recipes to your library first.");
      return;
    }
    setIsGenerating(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-meal-plan-generator", {
        body: {
          recipes: recipes.map(r => ({ id: r.id, name: r.name, calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fats, category: (r.tags || [])[0] || "General" })),
          macro_targets: macroTargets,
          client_context: contextData,
          preferences: { days: parseInt(days), meals_per_day: parseInt(mealsPerDay), goal: mealGoal, restrictions },
        },
      });
      if (error) throw error;
      if (data?.meal_plan) {
        setResult(data.meal_plan);
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate meal plan");
    } finally {
      setIsGenerating(false);
    }
  };

  const recipeMap = new Map(recipes?.map(r => [r.id, r.name]) || []);

  const handleCopy = () => {
    if (!result) return;
    const text = `${result.name}\n${result.description || ""}\n\n${
      (result.days || []).map((d: any) =>
        `Day ${d.day}:\n${(d.meals || []).map((m: any) => `  ${m.meal_type}: ${recipeMap.get(m.recipe_id) || m.recipe_id} (×${m.servings})`).join("\n")}`
      ).join("\n\n")
    }`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UtensilsCrossed className="h-4 w-4 text-primary" />
          AI Meal Plan
          <Badge variant="outline" className="text-[10px]">Draft</Badge>
        </CardTitle>
        <CardDescription>Generate a meal plan from your recipe library.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Days</Label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Day</SelectItem>
                <SelectItem value="3">3 Days</SelectItem>
                <SelectItem value="5">5 Days</SelectItem>
                <SelectItem value="7">7 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Meals/Day</Label>
            <Select value={mealsPerDay} onValueChange={setMealsPerDay}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 Meals</SelectItem>
                <SelectItem value="3">3 Meals</SelectItem>
                <SelectItem value="4">4 Meals</SelectItem>
                <SelectItem value="5">5 Meals</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {macroTargets && (
          <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
            <div className="p-1.5 rounded bg-muted/50">
              <p className="text-muted-foreground">Cal</p>
              <p className="font-medium">{macroTargets.target_calories || "—"}</p>
            </div>
            <div className="p-1.5 rounded bg-muted/50">
              <p className="text-muted-foreground">P</p>
              <p className="font-medium">{macroTargets.target_protein || "—"}g</p>
            </div>
            <div className="p-1.5 rounded bg-muted/50">
              <p className="text-muted-foreground">C</p>
              <p className="font-medium">{macroTargets.target_carbs || "—"}g</p>
            </div>
            <div className="p-1.5 rounded bg-muted/50">
              <p className="text-muted-foreground">F</p>
              <p className="font-medium">{macroTargets.target_fats || "—"}g</p>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1.5 text-muted-foreground h-7 w-full justify-start"
          onClick={() => setShowPrefs(!showPrefs)}
        >
          {showPrefs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          More Options
        </Button>

        {showPrefs && (
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <div>
              <Label className="text-xs">Goal</Label>
              <Input value={mealGoal} onChange={(e) => setMealGoal(e.target.value)} className="h-9 text-sm" placeholder="e.g., weight loss" />
            </div>
            <div>
              <Label className="text-xs">Restrictions</Label>
              <Input value={restrictions} onChange={(e) => setRestrictions(e.target.value)} className="h-9 text-sm" placeholder="e.g., no dairy" />
            </div>
          </div>
        )}

        <Button className="w-full gap-1.5" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate Meal Plan
        </Button>

        {result && (
          <>
            <Separator />
            <div className="space-y-3">
              <p className="text-sm font-medium">{result.name}</p>
              <p className="text-xs text-muted-foreground">{result.description}</p>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(result.days || []).map((d: any) => (
                  <div key={d.day} className="p-2 rounded bg-muted/50 space-y-1">
                    <p className="text-xs font-medium">Day {d.day}</p>
                    {(d.meals || []).map((m: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="capitalize text-muted-foreground w-16">{m.meal_type}</span>
                        <span className="flex-1 truncate font-medium">{recipeMap.get(m.recipe_id) || "Unknown"}</span>
                        <span className="text-muted-foreground">×{m.servings}</span>
                      </div>
                    ))}
                    {d.estimated_calories && (
                      <p className="text-[10px] text-muted-foreground">~{d.estimated_calories} cal | {d.estimated_protein}g protein</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs gap-1" onClick={handleCopy}>
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={handleGenerate} disabled={isGenerating}>
                  <RefreshCw className="h-3 w-3" /> Regenerate
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">⚠️ AI Draft — Review before assigning.</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
