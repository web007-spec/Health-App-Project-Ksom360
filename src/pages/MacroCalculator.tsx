import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, TrendingUp, Activity, Target, Save } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SaveMacrosToMealPlanDialog } from "@/components/nutrition/SaveMacrosToMealPlanDialog";

type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
type Goal = "weight_loss" | "maintenance" | "muscle_gain" | "aggressive_cut";

interface MacroResults {
  bmr: number;
  tdee: number;
  targetCalories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export default function MacroCalculator() {
  const { user } = useAuth();
  const [gender, setGender] = useState<"male" | "female">("male");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [goal, setGoal] = useState<Goal>("maintenance");
  const [bodyFat, setBodyFat] = useState("");
  const [results, setResults] = useState<MacroResults | null>(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  // Fetch trainer's clients
  const { data: clients } = useQuery({
    queryKey: ["trainer-clients", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_clients")
        .select(`
          client_id,
          profiles!trainer_clients_client_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq("trainer_id", user?.id)
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const calculateMacros = () => {
    const weightKg = parseFloat(weight);
    const heightCm = parseFloat(height);
    const ageYears = parseInt(age);

    if (!weightKg || !heightCm || !ageYears) return;

    // Mifflin-St Jeor BMR calculation
    let bmr: number;
    if (gender === "male") {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
    } else {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
    }

    // Calculate TDEE
    const tdee = bmr * activityMultipliers[activityLevel];

    // Adjust calories based on goal
    let targetCalories: number;
    let proteinMultiplier: number;
    let fatPercentage: number;

    switch (goal) {
      case "aggressive_cut":
        targetCalories = tdee - 750;
        proteinMultiplier = 2.4;
        fatPercentage = 0.25;
        break;
      case "weight_loss":
        targetCalories = tdee - 500;
        proteinMultiplier = 2.2;
        fatPercentage = 0.25;
        break;
      case "maintenance":
        targetCalories = tdee;
        proteinMultiplier = 2.0;
        fatPercentage = 0.25;
        break;
      case "muscle_gain":
        targetCalories = tdee + 300;
        proteinMultiplier = 2.2;
        fatPercentage = 0.25;
        break;
      default:
        targetCalories = tdee;
        proteinMultiplier = 2.0;
        fatPercentage = 0.25;
    }

    // Calculate macros
    const protein = weightKg * proteinMultiplier;
    const proteinCalories = protein * 4;

    const fats = (targetCalories * fatPercentage) / 9;
    const fatCalories = fats * 9;

    const carbCalories = targetCalories - proteinCalories - fatCalories;
    const carbs = carbCalories / 4;

    setResults({
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      targetCalories: Math.round(targetCalories),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fats: Math.round(fats),
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Macro Calculator</h1>
          <p className="text-muted-foreground">
            Calculate optimal calorie and macro targets for your clients
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Client Information
              </CardTitle>
              <CardDescription>Enter client details to calculate macros</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={gender} onValueChange={(v) => setGender(v as "male" | "female")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="25"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder="70"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="175"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bodyFat">Body Fat % (optional)</Label>
                <Input
                  id="bodyFat"
                  type="number"
                  placeholder="20"
                  value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Activity Level</Label>
                <Select value={activityLevel} onValueChange={(v) => setActivityLevel(v as ActivityLevel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">Sedentary (Little/no exercise)</SelectItem>
                    <SelectItem value="light">Light (1-3 days/week)</SelectItem>
                    <SelectItem value="moderate">Moderate (3-5 days/week)</SelectItem>
                    <SelectItem value="active">Active (6-7 days/week)</SelectItem>
                    <SelectItem value="very_active">Very Active (2x per day)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Goal</Label>
                <Select value={goal} onValueChange={(v) => setGoal(v as Goal)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aggressive_cut">Aggressive Cut (-750 cal)</SelectItem>
                    <SelectItem value="weight_loss">Weight Loss (-500 cal)</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="muscle_gain">Muscle Gain (+300 cal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Assign to Client (optional)</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client to save for" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.client_id} value={client.client_id}>
                        {client.profiles?.full_name || client.profiles?.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedClientId && (
                  <p className="text-xs text-muted-foreground">
                    You'll be able to save these macros to a meal plan after calculating
                  </p>
                )}
              </div>

              <Button onClick={calculateMacros} className="w-full" size="lg">
                <Calculator className="h-4 w-4 mr-2" />
                Calculate Macros
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Calculation Results
              </CardTitle>
              <CardDescription>
                {results ? "Target macros based on client data" : "Results will appear after calculation"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {results ? (
                <div className="space-y-6">
                  {/* Calories Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        <span className="font-medium">BMR</span>
                      </div>
                      <span className="text-lg font-bold">{results.bmr} cal</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="font-medium">TDEE</span>
                      </div>
                      <span className="text-lg font-bold">{results.tdee} cal</span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border-2 border-primary">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        <span className="font-semibold text-lg">Target Calories</span>
                      </div>
                      <span className="text-2xl font-bold text-primary">{results.targetCalories}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Macros Section */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Macro Breakdown
                    </h4>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Protein</span>
                          <span className="text-lg font-bold">{results.protein}g</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{
                              width: `${(results.protein * 4 / results.targetCalories) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {Math.round((results.protein * 4 / results.targetCalories) * 100)}% of calories
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Carbs</span>
                          <span className="text-lg font-bold">{results.carbs}g</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500"
                            style={{
                              width: `${(results.carbs * 4 / results.targetCalories) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {Math.round((results.carbs * 4 / results.targetCalories) * 100)}% of calories
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Fats</span>
                          <span className="text-lg font-bold">{results.fats}g</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500"
                            style={{
                              width: `${(results.fats * 9 / results.targetCalories) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {Math.round((results.fats * 9 / results.targetCalories) * 100)}% of calories
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  {selectedClientId && (
                    <>
                      <Separator />
                      <Button 
                        onClick={() => setSaveDialogOpen(true)} 
                        className="w-full" 
                        size="lg"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save to Meal Plan
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Enter client information and click calculate to see results
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Save Macros Dialog */}
        {results && selectedClientId && (
          <SaveMacrosToMealPlanDialog
            open={saveDialogOpen}
            onOpenChange={setSaveDialogOpen}
            clientId={selectedClientId}
            macros={{
              targetCalories: results.targetCalories,
              protein: results.protein,
              carbs: results.carbs,
              fats: results.fats,
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
