import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SafetyControlsProps {
  clientId: string;
  trainerId: string;
}

const SAFETY_TOGGLES = [
  {
    key: "allow_plan_suggestions",
    label: "Allow Plan Suggestions",
    description: "System generates plan adjustment suggestions",
    defaultValue: true,
  },
  {
    key: "allow_level_auto_advance",
    label: "Allow Level Auto-Advance",
    description: "Automatically advance level when criteria met",
    defaultValue: false,
  },
  {
    key: "require_coach_approval_plans",
    label: "Require Coach Approval for Plan Changes",
    description: "All plan changes require manual approval",
    defaultValue: true,
  },
  {
    key: "lock_advanced_plans",
    label: "Lock Advanced Plans (Manual)",
    description: "Manually lock all high/extreme intensity plans",
    defaultValue: false,
  },
  {
    key: "athletic_safety_lock",
    label: "Athletic Safety Lock",
    description: "Enforce no-fasting and youth-safe restrictions",
    defaultValue: true,
  },
];

export function SafetyControls({ clientId, trainerId }: SafetyControlsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["cc-safety-settings", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("allow_plan_suggestions, allow_level_auto_advance, require_coach_approval_plans, lock_advanced_plans, athletic_safety_lock, engine_mode")
        .eq("client_id", clientId)
        .maybeSingle();
      return data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const { error } = await supabase
        .from("client_feature_settings")
        .update({ [key]: value } as any)
        .eq("client_id", clientId);
      if (error) throw error;

      await supabase.from("coach_override_log").insert({
        client_id: clientId,
        coach_id: trainerId,
        override_type: "safety",
        old_value: String(!value),
        new_value: String(value),
        reason: `Toggled ${key} to ${value}`,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cc-safety-settings"] });
      queryClient.invalidateQueries({ queryKey: ["cc-activity-log"] });
    },
  });

  const isAthletic = settings?.engine_mode === "athletic";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Safety Controls
        </CardTitle>
        <CardDescription>Per-client safety overrides and restrictions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {SAFETY_TOGGLES.map((toggle) => {
          // Only show athletic safety lock for athletic engine
          if (toggle.key === "athletic_safety_lock" && !isAthletic) return null;

          const currentValue = settings?.[toggle.key as keyof typeof settings] ?? toggle.defaultValue;

          return (
            <div key={toggle.key} className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">{toggle.label}</Label>
                <p className="text-xs text-muted-foreground">{toggle.description}</p>
              </div>
              <Switch
                checked={!!currentValue}
                onCheckedChange={(checked) => toggleMutation.mutate({ key: toggle.key, value: checked })}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
