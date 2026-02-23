import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Check, Moon, Utensils, Activity } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { toast } from "sonner";
import { format } from "date-fns";

const QUALITY_LABELS = ["", "Poor", "Fair", "Okay", "Good", "Great"];

export function DailyCheckinCard() {
  const clientId = useEffectiveClientId();
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const [sleepHours, setSleepHours] = useState<string>("");
  const [sleepQuality, setSleepQuality] = useState<number>(3);
  const [nutritionOnTrack, setNutritionOnTrack] = useState(false);
  const [recoveryCompleted, setRecoveryCompleted] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["daily-checkin", clientId, today],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from("daily_checkins")
        .select("*")
        .eq("client_id", clientId)
        .eq("checkin_date", today)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  useEffect(() => {
    if (existing) {
      setSleepHours(existing.sleep_hours?.toString() || "");
      setSleepQuality(existing.sleep_quality || 3);
      setNutritionOnTrack(existing.nutrition_on_track || false);
      setRecoveryCompleted(existing.recovery_completed || false);
      setHasChanges(false);
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("No client ID");
      const payload = {
        client_id: clientId,
        checkin_date: today,
        sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
        sleep_quality: sleepQuality,
        nutrition_on_track: nutritionOnTrack,
        recovery_completed: recoveryCompleted,
      };

      const { error } = await supabase
        .from("daily_checkins")
        .upsert(payload, { onConflict: "client_id,checkin_date" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-checkin"] });
      qc.invalidateQueries({ queryKey: ["engine-scores"] });
      toast.success("Check-in saved");
      setHasChanges(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markChanged = () => setHasChanges(true);

  if (isLoading) return null;

  const isComplete = existing && !hasChanges;

  return (
    <Card className={`border ${isComplete ? "border-emerald-500/30 bg-emerald-500/5" : "border-border"}`}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">Daily Check-In</p>
            <p className="text-xs text-muted-foreground">{format(new Date(), "EEEE, MMM d")}</p>
          </div>
          {isComplete && (
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Check className="h-4 w-4" />
              <span className="text-xs font-semibold">Complete</span>
            </div>
          )}
        </div>

        {/* Sleep Hours */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Moon className="h-3.5 w-3.5 text-muted-foreground" />
            <Label className="text-xs font-semibold">Sleep Hours</Label>
          </div>
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            max="24"
            step="0.5"
            placeholder="e.g. 7.5"
            value={sleepHours}
            onChange={(e) => { setSleepHours(e.target.value); markChanged(); }}
            className="h-9 text-sm"
          />
        </div>

        {/* Sleep Quality */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Sleep Quality</Label>
            <span className="text-xs text-muted-foreground">{QUALITY_LABELS[sleepQuality]}</span>
          </div>
          <Slider
            value={[sleepQuality]}
            onValueChange={([v]) => { setSleepQuality(v); markChanged(); }}
            min={1}
            max={5}
            step={1}
            className="w-full"
          />
        </div>

        {/* Nutrition Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Utensils className="h-3.5 w-3.5 text-muted-foreground" />
            <Label className="text-xs font-semibold">Stayed within plan today</Label>
          </div>
          <Switch
            checked={nutritionOnTrack}
            onCheckedChange={(v) => { setNutritionOnTrack(v); markChanged(); }}
          />
        </div>

        {/* Recovery Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            <Label className="text-xs font-semibold">Recovery completed</Label>
          </div>
          <Switch
            checked={recoveryCompleted}
            onCheckedChange={(v) => { setRecoveryCompleted(v); markChanged(); }}
          />
        </div>

        {/* Save */}
        {hasChanges && (
          <Button
            className="w-full h-9 text-sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving..." : "Save Check-In"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
