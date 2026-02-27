import { useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, ArrowRight, Cake, User, Weight, Ruler, Percent, Activity, Target, UtensilsCrossed } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

type Step = "form" | "activity" | "goal" | "diet" | "results" | "manual";

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary", desc: "Little or no exercise", multiplier: 1.2 },
  { value: "light", label: "Lightly active", desc: "Exercise 1–3 days/week", multiplier: 1.375 },
  { value: "moderate", label: "Moderately active", desc: "Exercise 3–5 days/week", multiplier: 1.55 },
  { value: "active", label: "Very active", desc: "Intense exercise 6–7 days a week", multiplier: 1.725 },
  { value: "extreme", label: "Extremely active", desc: "2+ hrs of intense physical activity daily", multiplier: 1.9 },
];

const GOALS = [
  { value: "lose", label: "Lose weight", icon: "⬇️", factor: 0.8 },
  { value: "recomp", label: "Improve body composition (build muscle & lose fat)", icon: "💪", factor: 0.9 },
  { value: "gain", label: "Gain weight and build muscle", icon: "⬆️", factor: 1.15 },
  { value: "maintain", label: "Maintain weight and body composition", icon: "⚖️", factor: 1.0 },
];

const DIET_STYLES = [
  {
    value: "standard_keto",
    label: "Standard Keto",
    split: "75F / 20P / 5C",
    icon: "🥑",
    fatPct: 0.75, proteinPct: 0.20, carbsPct: 0.05,
    desc: "The classic ketogenic ratio — maximum fat adaptation",
    bestFor: "Best for: Weight loss, metabolic health, epilepsy management, and those new to keto",
  },
  {
    value: "high_protein_keto",
    label: "High Protein Keto",
    split: "60F / 35P / 5C",
    icon: "💪",
    fatPct: 0.60, proteinPct: 0.35, carbsPct: 0.05,
    desc: "Higher protein for muscle preservation while staying in ketosis",
    bestFor: "Best for: Athletes, bodybuilders, those wanting to build/maintain muscle on keto",
  },
  {
    value: "modified_keto",
    label: "Modified Keto",
    split: "70F / 25P / 5C",
    icon: "⚖️",
    fatPct: 0.70, proteinPct: 0.25, carbsPct: 0.05,
    desc: "A balanced middle ground — sustainable long-term approach",
    bestFor: "Best for: Active individuals seeking a sustainable keto lifestyle with moderate protein",
  },
];

const FIELD_ICONS = [
  { icon: Cake, color: "bg-slate-800 text-white" },
  { icon: User, color: "bg-slate-700 text-white" },
  { icon: Weight, color: "bg-primary text-primary-foreground" },
  { icon: Ruler, color: "bg-primary text-primary-foreground" },
  { icon: Percent, color: "bg-primary text-primary-foreground" },
  { icon: Activity, color: "bg-orange-500 text-white" },
  { icon: Target, color: "bg-orange-500 text-white" },
];

export default function ClientMacroSetup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const clientId = useEffectiveClientId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("form");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [weightLbs, setWeightLbs] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [goal, setGoal] = useState("");
  const [activitySheetOpen, setActivitySheetOpen] = useState(false);
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);
  const [dietSheetOpen, setDietSheetOpen] = useState(false);
  const [dietStyle, setDietStyle] = useState("");

  // Manual mode
  const [manualCalories, setManualCalories] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFats, setManualFats] = useState("");

  // Calculated results
  const [calcResults, setCalcResults] = useState<{ calories: number; protein: number; carbs: number; fats: number } | null>(null);

  // Fetch existing macro targets
  const { data: existingTargets } = useQuery({
    queryKey: ["client-macro-targets", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_macro_targets")
        .select("*")
        .eq("client_id", clientId!)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const handleCalculate = () => {
    const w = parseFloat(weightLbs) * 0.453592; // lbs to kg
    const h = (parseFloat(heightFt) * 12 + parseFloat(heightIn || "0")) * 2.54; // ft/in to cm
    const a = parseInt(age);

    if (!w || !h || !a) return;

    // Mifflin-St Jeor
    let bmr = gender === "male"
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161;

    const actMultiplier = ACTIVITY_LEVELS.find(l => l.value === activityLevel)?.multiplier || 1.55;
    let tdee = bmr * actMultiplier;

    const goalFactor = GOALS.find(g => g.value === goal)?.factor || 1.0;
    tdee *= goalFactor;

    const selectedDiet = DIET_STYLES.find(d => d.value === dietStyle) || DIET_STYLES[1];
    const calories = Math.round(tdee);
    const protein = Math.round((calories * selectedDiet.proteinPct) / 4);
    const fats = Math.round((calories * selectedDiet.fatPct) / 9);
    const carbs = Math.round((calories * selectedDiet.carbsPct) / 4);

    setCalcResults({ calories, protein: Math.max(protein, 0), carbs: Math.max(carbs, 0), fats: Math.max(fats, 0) });
    setStep("results");
  };

  const saveMutation = useMutation({
    mutationFn: async (macros: { calories: number; protein: number; carbs: number; fats: number }) => {
      // When a trainer is impersonating, include trainer_id so the trainer's ALL policy matches
      const isImpersonating = clientId !== user?.id;
      const payload = {
        client_id: clientId!,
        tracking_option: "all_macros" as const,
        target_calories: macros.calories,
        target_protein: macros.protein,
        target_carbs: macros.carbs,
        target_fats: macros.fats,
        is_active: true,
        diet_style: dietStyle || "custom",
        ...(isImpersonating ? { trainer_id: user?.id } : {}),
      };

      if (existingTargets) {
        const { error } = await supabase
          .from("client_macro_targets")
          .update(payload)
          .eq("id", existingTargets.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("client_macro_targets")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-macro-targets"] });
      toast({ title: "Macro goals saved!" });
      navigate("/client/dashboard");
    },
    onError: () => {
      toast({ title: "Error saving goals", variant: "destructive" });
    },
  });

  const handleNext = () => {
    if (!age || !weightLbs || !heightFt) {
      toast({ title: "Please fill in Age, Weight, and Height", variant: "destructive" });
      return;
    }
    setActivitySheetOpen(true);
  };

  const handleActivitySelect = (value: string) => {
    setActivityLevel(value);
    setActivitySheetOpen(false);
    setTimeout(() => setGoalSheetOpen(true), 300);
  };

  const handleGoalSelect = (value: string) => {
    setGoal(value);
    setGoalSheetOpen(false);
    setTimeout(() => setDietSheetOpen(true), 300);
  };

  const handleDietSelect = (value: string) => {
    setDietStyle(value);
    setDietSheetOpen(false);
    setTimeout(() => handleCalculateWithGoalAndDiet(goal, value), 300);
  };

  const handleCalculateWithGoalAndDiet = (selectedGoal: string, selectedDietValue: string) => {
    const w = parseFloat(weightLbs) * 0.453592;
    const h = (parseFloat(heightFt) * 12 + parseFloat(heightIn || "0")) * 2.54;
    const a = parseInt(age);

    if (!w || !h || !a) return;

    let bmr = gender === "male"
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161;

    const actMultiplier = ACTIVITY_LEVELS.find(l => l.value === activityLevel)?.multiplier || 1.55;
    let tdee = bmr * actMultiplier;

    const goalFactor = GOALS.find(g => g.value === selectedGoal)?.factor || 1.0;
    tdee *= goalFactor;

    const selectedDiet = DIET_STYLES.find(d => d.value === selectedDietValue) || DIET_STYLES[1];
    const calories = Math.round(tdee);
    const protein = Math.round((calories * selectedDiet.proteinPct) / 4);
    const fats = Math.round((calories * selectedDiet.fatPct) / 9);
    const carbs = Math.round((calories * selectedDiet.carbsPct) / 4);

    setCalcResults({ calories, protein: Math.max(protein, 0), carbs: Math.max(carbs, 0), fats: Math.max(fats, 0) });
    setStep("results");
  };

  const handleSaveManual = () => {
    const c = parseInt(manualCalories);
    const p = parseInt(manualProtein);
    const cb = parseInt(manualCarbs);
    const f = parseInt(manualFats);
    if (!c) {
      toast({ title: "Please enter at least calories", variant: "destructive" });
      return;
    }
    saveMutation.mutate({ calories: c, protein: p || 0, carbs: cb || 0, fats: f || 0 });
  };

  // Donut chart for results
  const renderDonutChart = (data: { calories: number; protein: number; carbs: number; fats: number }) => {
    const totalMacroCalories = data.protein * 4 + data.carbs * 4 + data.fats * 9;
    const proteinPct = totalMacroCalories > 0 ? Math.round((data.protein * 4 / totalMacroCalories) * 100) : 33;
    const carbsPct = totalMacroCalories > 0 ? Math.round((data.carbs * 4 / totalMacroCalories) * 100) : 33;
    const fatsPct = totalMacroCalories > 0 ? Math.round((data.fats * 9 / totalMacroCalories) * 100) : 34;

    const chartData = [
      { name: "Protein", value: data.protein * 4, color: "hsl(217, 91%, 60%)" },
      { name: "Carbs", value: data.carbs * 4, color: "hsl(142, 71%, 45%)" },
      { name: "Fat", value: data.fats * 9, color: "hsl(45, 93%, 58%)" },
    ];

    return (
      <div className="flex flex-col items-center">
        <div className="relative w-56 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-foreground">{data.calories.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">calories</span>
          </div>
        </div>

        <div className="w-full mt-6 space-y-0 divide-y divide-border">
          <div className="flex items-center justify-between py-3 px-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(217, 91%, 60%)" }} />
              <span className="text-sm font-medium text-foreground">Protein</span>
              <span className="text-sm text-muted-foreground">{data.protein} g</span>
            </div>
            <span className="text-sm font-bold text-foreground">{proteinPct} %</span>
          </div>
          <div className="flex items-center justify-between py-3 px-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(142, 71%, 45%)" }} />
              <span className="text-sm font-medium text-foreground">Carbs</span>
              <span className="text-sm text-muted-foreground">{data.carbs} g</span>
            </div>
            <span className="text-sm font-bold text-foreground">{carbsPct} %</span>
          </div>
          <div className="flex items-center justify-between py-3 px-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(45, 93%, 58%)" }} />
              <span className="text-sm font-medium text-foreground">Fat</span>
              <span className="text-sm text-muted-foreground">{data.fats} g</span>
            </div>
            <span className="text-sm font-bold text-foreground">{fatsPct} %</span>
          </div>
        </div>
      </div>
    );
  };

  // Manual mode
  if (step === "manual") {
    return (
      <ClientLayout>
        <div className="p-4 pb-8 space-y-6 max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setStep("form")}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold">Set Manually</h1>
            <div className="w-10" />
          </div>

          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
              <UtensilsCrossed className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Set Your Macros</h2>
            <p className="text-sm text-muted-foreground mt-1">Enter your custom macro targets</p>
          </div>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Calories *</label>
                <Input type="number" value={manualCalories} onChange={e => setManualCalories(e.target.value)} placeholder="2000" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Protein (g)</label>
                <Input type="number" value={manualProtein} onChange={e => setManualProtein(e.target.value)} placeholder="150" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Carbs (g)</label>
                <Input type="number" value={manualCarbs} onChange={e => setManualCarbs(e.target.value)} placeholder="250" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Fat (g)</label>
                <Input type="number" value={manualFats} onChange={e => setManualFats(e.target.value)} placeholder="65" className="mt-1" />
              </div>
            </CardContent>
          </Card>

          <Button className="w-full h-12 rounded-xl text-base font-semibold" onClick={handleSaveManual} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save Macro Goals"}
          </Button>
        </div>
      </ClientLayout>
    );
  }

  // Results view
  if (step === "results" && calcResults) {
    return (
      <ClientLayout>
        <div className="p-4 pb-8 space-y-6 max-w-lg mx-auto">
          <div className="flex items-center justify-end">
            <Button variant="link" className="text-primary font-semibold" onClick={() => setStep("form")}>
              Edit Goals
            </Button>
          </div>

          <h1 className="text-2xl font-bold text-center">Your Macro Goals</h1>

          {renderDonutChart(calcResults)}

          <div className="pt-4 space-y-3">
            <Button
              className="w-full h-12 rounded-xl text-base font-semibold"
              onClick={() => saveMutation.mutate(calcResults)}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save Goals"}
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl text-base"
              onClick={() => navigate("/client/dashboard")}
            >
              Close
            </Button>
          </div>
        </div>
      </ClientLayout>
    );
  }

  // Main form
  const selectedActivity = ACTIVITY_LEVELS.find(l => l.value === activityLevel);
  const selectedGoal = GOALS.find(g => g.value === goal);

  return (
    <ClientLayout>
      <div className="p-4 pb-8 space-y-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/dashboard")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="link" className="text-primary font-semibold" onClick={() => setStep("manual")}>
            Set Manually
          </Button>
        </div>

        {/* Hero icon */}
        <div className="text-center py-2">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-b from-muted to-background mb-4">
            <UtensilsCrossed className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Calculate Your Macro Goals</h1>
          <p className="text-sm text-muted-foreground mt-1">Your details help us tailor your macro goals</p>
        </div>

        {/* Stats form - like the screenshot */}
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {/* Age */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${FIELD_ICONS[0].color}`}>
                <Cake className="h-5 w-5" />
              </div>
              <span className="flex-1 text-sm font-medium">Age</span>
              <Input
                type="number"
                value={age}
                onChange={e => setAge(e.target.value)}
                placeholder="Required"
                className="w-20 text-right border-0 bg-transparent p-0 h-auto text-sm font-medium focus-visible:ring-0"
                min={1}
                max={120}
              />
            </div>

            {/* Gender */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${FIELD_ICONS[1].color}`}>
                <User className="h-5 w-5" />
              </div>
              <span className="flex-1 text-sm font-medium">Gender</span>
              <button
                className="text-sm font-medium text-foreground"
                onClick={() => setGender(gender === "male" ? "female" : "male")}
              >
                {gender === "male" ? "Male" : "Female"}
              </button>
            </div>

            {/* Weight */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${FIELD_ICONS[2].color}`}>
                <Weight className="h-5 w-5" />
              </div>
              <span className="flex-1 text-sm font-medium">Weight</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={weightLbs}
                  onChange={e => setWeightLbs(e.target.value)}
                  placeholder="Required"
                  className="w-16 text-right border-0 bg-transparent p-0 h-auto text-sm font-medium focus-visible:ring-0"
                />
                <span className="text-sm text-muted-foreground">lb</span>
              </div>
            </div>

            {/* Height */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${FIELD_ICONS[3].color}`}>
                <Ruler className="h-5 w-5" />
              </div>
              <span className="flex-1 text-sm font-medium">Height</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={heightFt}
                  onChange={e => setHeightFt(e.target.value)}
                  placeholder="ft"
                  className="w-10 text-right border-0 bg-transparent p-0 h-auto text-sm font-medium focus-visible:ring-0"
                />
                <span className="text-sm text-muted-foreground">ft</span>
                <Input
                  type="number"
                  value={heightIn}
                  onChange={e => setHeightIn(e.target.value)}
                  placeholder="in"
                  className="w-10 text-right border-0 bg-transparent p-0 h-auto text-sm font-medium focus-visible:ring-0"
                />
                <span className="text-sm text-muted-foreground">in</span>
              </div>
            </div>

            {/* Body Fat */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${FIELD_ICONS[4].color}`}>
                <Percent className="h-5 w-5" />
              </div>
              <span className="flex-1 text-sm font-medium">Body Fat</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={bodyFat}
                  onChange={e => setBodyFat(e.target.value)}
                  placeholder="Optional"
                  className="w-16 text-right border-0 bg-transparent p-0 h-auto text-sm font-medium focus-visible:ring-0"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>

            {/* Activity Level */}
            <div
              className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
              onClick={() => setActivitySheetOpen(true)}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${FIELD_ICONS[5].color}`}>
                <Activity className="h-5 w-5" />
              </div>
              <span className="flex-1 text-sm font-medium">Activity level</span>
              <span className="text-sm text-muted-foreground">
                {selectedActivity?.label || "Required"}
              </span>
            </div>

            {/* Goal */}
            <div
              className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
              onClick={() => setGoalSheetOpen(true)}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${FIELD_ICONS[6].color}`}>
                <Target className="h-5 w-5" />
              </div>
              <span className="flex-1 text-sm font-medium">Goal</span>
              <span className="text-sm text-muted-foreground">
                {selectedGoal?.label.split(" ").slice(0, 2).join(" ") || "Required"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Next button */}
        <Button className="w-full h-12 rounded-xl text-base font-semibold gap-2" onClick={handleNext}>
          Next <ArrowRight className="h-4 w-4" />
        </Button>

        {/* Activity Level Sheet */}
        <Sheet open={activitySheetOpen} onOpenChange={setActivitySheetOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh]">
            <div className="space-y-1 mb-6">
              <div className="flex gap-1 mb-4">
                <div className="h-1 flex-1 rounded-full bg-primary" />
                <div className="h-1 flex-1 rounded-full bg-muted" />
                <div className="h-1 flex-1 rounded-full bg-muted" />
              </div>
              <h2 className="text-xl font-bold">Activity level</h2>
              <p className="text-sm text-muted-foreground">Choose the option that reflects your usual activity</p>
            </div>
            <div className="space-y-3">
              {ACTIVITY_LEVELS.map(level => (
                <button
                  key={level.value}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    activityLevel === level.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => handleActivitySelect(level.value)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-end gap-0.5 h-6">
                      {[1, 2, 3, 4].map(bar => (
                        <div
                          key={bar}
                          className={`w-1.5 rounded-sm transition-colors ${
                            bar <= (ACTIVITY_LEVELS.indexOf(level) + 1) ? "bg-primary" : "bg-muted"
                          }`}
                          style={{ height: `${bar * 5 + 4}px` }}
                        />
                      ))}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{level.label}</p>
                      <p className="text-xs text-muted-foreground">{level.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {/* Goal Sheet */}
        <Sheet open={goalSheetOpen} onOpenChange={setGoalSheetOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh]">
            <div className="space-y-1 mb-6">
              <div className="flex gap-1 mb-4">
                <div className="h-1 flex-1 rounded-full bg-muted" />
                <div className="h-1 flex-1 rounded-full bg-primary" />
                <div className="h-1 flex-1 rounded-full bg-muted" />
              </div>
              <h2 className="text-xl font-bold">Primary goal</h2>
              <p className="text-sm text-muted-foreground">Share what you want to achieve</p>
            </div>
            <div className="space-y-3">
              {GOALS.map(g => (
                <button
                  key={g.value}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    goal === g.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => handleGoalSelect(g.value)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{g.icon}</span>
                    <p className="font-semibold text-sm">{g.label}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-6">
              <Button variant="outline" size="icon" className="rounded-full" onClick={() => { setGoalSheetOpen(false); setTimeout(() => setActivitySheetOpen(true), 300); }}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button className="flex-1 h-12 rounded-xl text-base font-semibold gap-2" onClick={() => { if (goal) { setGoalSheetOpen(false); setTimeout(() => setDietSheetOpen(true), 300); } }}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Diet Style Sheet */}
        <Sheet open={dietSheetOpen} onOpenChange={setDietSheetOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="space-y-1 mb-6">
              <div className="flex gap-1 mb-4">
                <div className="h-1 flex-1 rounded-full bg-muted" />
                <div className="h-1 flex-1 rounded-full bg-muted" />
                <div className="h-1 flex-1 rounded-full bg-primary" />
              </div>
              <h2 className="text-xl font-bold">Choose Your Keto Style</h2>
              <p className="text-sm text-muted-foreground">Pick the approach that fits your lifestyle</p>
            </div>
            <div className="space-y-3">
              {DIET_STYLES.map(d => (
                <button
                  key={d.value}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    dietStyle === d.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setDietStyle(d.value)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">{d.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm">{d.label}</p>
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{d.split}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{d.desc}</p>
                      <p className="text-xs text-primary font-medium mt-1.5">{d.bestFor}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-6">
              <Button variant="outline" size="icon" className="rounded-full" onClick={() => { setDietSheetOpen(false); setTimeout(() => setGoalSheetOpen(true), 300); }}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button className="flex-1 h-12 rounded-xl text-base font-semibold gap-2" onClick={() => { if (dietStyle) handleDietSelect(dietStyle); }} disabled={!dietStyle}>
                Calculate your Macro Goal <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </ClientLayout>
  );
}
