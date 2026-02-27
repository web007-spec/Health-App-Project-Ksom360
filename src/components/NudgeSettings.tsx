import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Bell, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";

export function NudgeSettings() {
  const clientId = useEffectiveClientId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [nudgeEnabled, setNudgeEnabled] = useState(true);
  const [frequency, setFrequency] = useState("medium");
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("07:00");
  const [checkin, setCheckin] = useState(true);
  const [workout, setWorkout] = useState(true);
  const [fasting, setFasting] = useState(true);
  const [sleep, setSleep] = useState(true);
  const [recovery, setRecovery] = useState(true);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["nudge-settings", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_feature_settings")
        .select("nudge_enabled, nudge_frequency, quiet_hours_start, quiet_hours_end, nudge_checkin, nudge_workout, nudge_fasting, nudge_sleep, nudge_recovery, engine_mode")
        .eq("client_id", clientId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  useEffect(() => {
    if (settings) {
      setNudgeEnabled(settings.nudge_enabled ?? true);
      setFrequency(settings.nudge_frequency ?? "medium");
      setQuietStart(settings.quiet_hours_start ?? "22:00");
      setQuietEnd(settings.quiet_hours_end ?? "07:00");
      setCheckin(settings.nudge_checkin ?? true);
      setWorkout(settings.nudge_workout ?? true);
      setFasting(settings.nudge_fasting ?? true);
      setSleep(settings.nudge_sleep ?? true);
      setRecovery(settings.nudge_recovery ?? true);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("client_feature_settings")
        .update({
          nudge_enabled: nudgeEnabled,
          nudge_frequency: frequency,
          quiet_hours_start: quietStart,
          quiet_hours_end: quietEnd,
          nudge_checkin: checkin,
          nudge_workout: workout,
          nudge_fasting: fasting,
          nudge_sleep: sleep,
          nudge_recovery: recovery,
        } as any)
        .eq("client_id", clientId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nudge-settings"] });
      toast({ title: "Settings saved", description: "Your notification preferences have been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const isAthletic = settings?.engine_mode === "athletic";

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-5 w-5" />
          Smart Nudges
        </CardTitle>
        <CardDescription>
          Receive engine-specific reminders to stay on track. No spam, no hype.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Master toggle */}
        <div className="flex items-center justify-between">
          <Label>Enable Nudges</Label>
          <Switch checked={nudgeEnabled} onCheckedChange={setNudgeEnabled} />
        </div>

        {nudgeEnabled && (
          <>
            {/* Frequency */}
            <div className="space-y-1.5">
              <Label>Nudge Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (1 per day)</SelectItem>
                  <SelectItem value="medium">Medium (2 per day)</SelectItem>
                  <SelectItem value="high">High (3 per day)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quiet Hours */}
            <div className="space-y-1.5">
              <Label>Quiet Hours</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                  className="w-32"
                />
              </div>
              <p className="text-xs text-muted-foreground">No notifications during this window.</p>
            </div>

            {/* Reminder Types */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Reminder Types</Label>

              <div className="flex items-center justify-between">
                <span className="text-sm">Check-in reminders</span>
                <Switch checked={checkin} onCheckedChange={setCheckin} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Workout reminders</span>
                <Switch checked={workout} onCheckedChange={setWorkout} />
              </div>

              {!isAthletic && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Fasting reminders</span>
                  <Switch checked={fasting} onCheckedChange={setFasting} />
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm">Sleep wind-down reminders</span>
                <Switch checked={sleep} onCheckedChange={setSleep} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Recovery reminders</span>
                <Switch checked={recovery} onCheckedChange={setRecovery} />
              </div>
            </div>
          </>
        )}

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full"
        >
          {saveMutation.isPending ? "Saving..." : "Save Preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}
