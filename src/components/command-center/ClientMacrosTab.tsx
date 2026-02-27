import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Activity, Calculator } from "lucide-react";

interface Props {
  clientId: string;
  trainerId: string;
}

export function ClientMacrosTab({ clientId, trainerId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: macroTargets } = useQuery({
    queryKey: ["client-macro-targets", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_macro_targets")
        .select("*")
        .eq("client_id", clientId)
        .eq("trainer_id", trainerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Manual form state
  const [trackingOption, setTrackingOption] = useState("all_macros");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");

  // Auto-calc state
  const [autoForm, setAutoForm] = useState({
    age: "", gender: "male", height: "", weight: "", bodyFat: "",
    activityLevel: "moderate", goal: "maintain",
  });

  useEffect(() => {
    if (macroTargets) {
      setTrackingOption(macroTargets.tracking_option || "all_macros");
      setCalories(macroTargets.target_calories?.toString() || "");
      setProtein(macroTargets.target_protein?.toString() || "");
      setCarbs(macroTargets.target_carbs?.toString() || "");
      setFats(macroTargets.target_fats?.toString() || "");
    }
  }, [macroTargets]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        client_id: clientId,
        trainer_id: trainerId,
        tracking_option: trackingOption,
        target_calories: calories ? parseInt(calories) : null,
        target_protein: protein ? parseFloat(protein) : null,
        target_carbs: carbs ? parseFloat(carbs) : null,
        target_fats: fats ? parseFloat(fats) : null,
        is_active: true,
      };

      if (macroTargets) {
        const { error } = await supabase
          .from("client_macro_targets")
          .update(payload)
          .eq("id", macroTargets.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_macro_targets").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-macro-targets", clientId] });
      toast({ title: "Macro targets saved" });
    },
    onError: () => {
      toast({ title: "Error saving targets", variant: "destructive" });
    },
  });

  // Mifflin-St Jeor auto-calc
  const handleAutoCalc = () => {
    const { age, gender, height, weight, bodyFat, activityLevel, goal } = autoForm;
    if (!age || !height || !weight) return;

    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);

    let bmr = gender === "male"
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161;

    const multipliers: Record<string, number> = {
      sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, extreme: 1.9,
    };
    let tdee = bmr * (multipliers[activityLevel] || 1.55);

    if (goal === "lose") tdee *= 0.8;
    else if (goal === "gain") tdee *= 1.15;

    const calcCalories = Math.round(tdee);
    const calcProtein = Math.round(w * 2.2); // 1g per lb
    const calcFats = Math.round((calcCalories * 0.25) / 9);
    const calcCarbs = Math.round((calcCalories - calcProtein * 4 - calcFats * 9) / 4);

    setCalories(calcCalories.toString());
    setProtein(calcProtein.toString());
    setCarbs(calcCarbs.toString());
    setFats(calcFats.toString());
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Macros</h2>

      {/* Current targets display */}
      {macroTargets && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Current Macro Targets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">{macroTargets.target_calories || "--"}</p>
                <p className="text-xs text-muted-foreground">Calories</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{macroTargets.target_protein || "--"}g</p>
                <p className="text-xs text-muted-foreground">Protein</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent-foreground">{macroTargets.target_carbs || "--"}g</p>
                <p className="text-xs text-muted-foreground">Carbs</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary-foreground">{macroTargets.target_fats || "--"}g</p>
                <p className="text-xs text-muted-foreground">Fat</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Set goals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Set Macro Goals</CardTitle>
          <CardDescription>Auto-calculate using client details or set manually</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="manual" className="space-y-4">
            <TabsList className="w-full">
              <TabsTrigger value="auto" className="flex-1 gap-1">
                <Calculator className="h-4 w-4" /> Auto Calculate
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex-1 gap-1">
                <Activity className="h-4 w-4" /> Set Manually
              </TabsTrigger>
            </TabsList>

            <TabsContent value="auto" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Age</Label>
                  <Input type="number" value={autoForm.age} onChange={e => setAutoForm(p => ({ ...p, age: e.target.value }))} />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select value={autoForm.gender} onValueChange={v => setAutoForm(p => ({ ...p, gender: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Height (cm)</Label>
                  <Input type="number" value={autoForm.height} onChange={e => setAutoForm(p => ({ ...p, height: e.target.value }))} />
                </div>
                <div>
                  <Label>Weight (kg)</Label>
                  <Input type="number" value={autoForm.weight} onChange={e => setAutoForm(p => ({ ...p, weight: e.target.value }))} />
                </div>
                <div>
                  <Label>Body Fat % (optional)</Label>
                  <Input type="number" value={autoForm.bodyFat} onChange={e => setAutoForm(p => ({ ...p, bodyFat: e.target.value }))} />
                </div>
                <div>
                  <Label>Activity Level</Label>
                  <Select value={autoForm.activityLevel} onValueChange={v => setAutoForm(p => ({ ...p, activityLevel: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">Sedentary</SelectItem>
                      <SelectItem value="light">Light (1-3 days/wk)</SelectItem>
                      <SelectItem value="moderate">Moderate (3-5 days/wk)</SelectItem>
                      <SelectItem value="active">Active (6-7 days/wk)</SelectItem>
                      <SelectItem value="extreme">Extremely Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Goal</Label>
                  <Select value={autoForm.goal} onValueChange={v => setAutoForm(p => ({ ...p, goal: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lose">Lose Weight</SelectItem>
                      <SelectItem value="maintain">Maintain</SelectItem>
                      <SelectItem value="gain">Gain Weight</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleAutoCalc} variant="outline" className="w-full">
                Calculate
              </Button>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <div>
                <Label>Tracking Option</Label>
                <Select value={trackingOption} onValueChange={setTrackingOption}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_macros">All Macros (Cal, P, C, F)</SelectItem>
                    <SelectItem value="calories_only">Calories Only</SelectItem>
                    <SelectItem value="protein_and_calories">Protein & Calories</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          {/* Macro inputs (shared between both tabs) */}
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Calories</Label>
                <Input type="number" value={calories} onChange={e => setCalories(e.target.value)} placeholder="2000" />
              </div>
              {trackingOption !== "calories_only" && (
                <div>
                  <Label>Protein (g)</Label>
                  <Input type="number" value={protein} onChange={e => setProtein(e.target.value)} placeholder="150" />
                </div>
              )}
              {trackingOption === "all_macros" && (
                <>
                  <div>
                    <Label>Carbs (g)</Label>
                    <Input type="number" value={carbs} onChange={e => setCarbs(e.target.value)} placeholder="250" />
                  </div>
                  <div>
                    <Label>Fat (g)</Label>
                    <Input type="number" value={fats} onChange={e => setFats(e.target.value)} placeholder="65" />
                  </div>
                </>
              )}
            </div>

            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
              {macroTargets ? "Update Macro Targets" : "Save Macro Targets"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
