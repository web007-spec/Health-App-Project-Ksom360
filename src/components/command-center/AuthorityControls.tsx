import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SubscriptionTier } from "@/lib/featureAccessGuard";
import type { EngineMode } from "@/lib/engineConfig";

interface AuthorityControlsProps {
  clientId: string;
  trainerId: string;
}

interface AuthoritySettings {
  ai_suggestions_enabled: boolean;
  auto_level_advance_enabled: boolean;
  auto_plan_adjust_enabled: boolean;
  auto_nudge_optimization_enabled: boolean;
  engine_mode: EngineMode;
  subscription_tier: SubscriptionTier;
}

const AUTHORITY_TOGGLES = [
  {
    key: "ai_suggestions_enabled",
    label: "AI Suggestions",
    description: "Generate draft plan suggestions via Copilot",
  },
  {
    key: "auto_level_advance_enabled",
    label: "Auto Level Advance",
    description: "Automatically advance level when criteria met",
  },
  {
    key: "auto_plan_adjust_enabled",
    label: "Auto Plan Adjust",
    description: "Apply plan adjustments without coach approval",
  },
  {
    key: "auto_nudge_optimization_enabled",
    label: "Auto Nudge Optimization",
    description: "Optimize nudge timing and frequency automatically",
  },
] as const;

// Engine defaults
const ENGINE_DEFAULTS: Record<EngineMode, Record<string, boolean>> = {
  metabolic: {
    ai_suggestions_enabled: true,
    auto_level_advance_enabled: false,
    auto_plan_adjust_enabled: false,
    auto_nudge_optimization_enabled: false,
  },
  performance: {
    ai_suggestions_enabled: true,
    auto_level_advance_enabled: true,
    auto_plan_adjust_enabled: false,
    auto_nudge_optimization_enabled: true,
  },
  athletic: {
    ai_suggestions_enabled: false,
    auto_level_advance_enabled: false,
    auto_plan_adjust_enabled: false,
    auto_nudge_optimization_enabled: false,
  },
};

function getAuthorityMode(settings: AuthoritySettings | null): {
  label: string;
  variant: "default" | "secondary" | "outline";
} {
  if (!settings) return { label: "Coach-Led", variant: "secondary" };

  const { ai_suggestions_enabled, auto_level_advance_enabled, auto_plan_adjust_enabled, auto_nudge_optimization_enabled } = settings;
  const autoCount = [auto_level_advance_enabled, auto_plan_adjust_enabled, auto_nudge_optimization_enabled].filter(Boolean).length;

  if (autoCount >= 2) return { label: "Semi-Autonomous", variant: "default" };
  if (ai_suggestions_enabled || autoCount >= 1) return { label: "Guardrail Mode", variant: "outline" };
  return { label: "Coach-Led", variant: "secondary" };
}

function canOverride(tier: SubscriptionTier, engine: EngineMode): boolean {
  if (engine === "athletic") return false;
  if (tier === "starter") return false;
  if (tier === "pro" && engine !== "performance") return false;
  return true; // elite / enterprise
}

function isToggleHardLocked(engine: EngineMode, _key: string): boolean {
  return engine === "athletic";
}

export function AuthorityControls({ clientId, trainerId }: AuthorityControlsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["cc-authority-settings", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("ai_suggestions_enabled, auto_level_advance_enabled, auto_plan_adjust_enabled, auto_nudge_optimization_enabled, engine_mode, subscription_tier")
        .eq("client_id", clientId)
        .maybeSingle();
      return data as AuthoritySettings | null;
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
        override_type: "authority",
        old_value: String(!value),
        new_value: String(value),
        reason: `Toggled ${key} to ${value}`,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cc-authority-settings"] });
      queryClient.invalidateQueries({ queryKey: ["cc-activity-log"] });
      toast({ title: "Authority updated" });
    },
  });

  const engine = (settings?.engine_mode || "performance") as EngineMode;
  const tier = (settings?.subscription_tier || "starter") as SubscriptionTier;
  const overridesAllowed = canOverride(tier, engine);
  const mode = getAuthorityMode(settings);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Authority Controls
          </CardTitle>
          <Badge variant={mode.variant}>{mode.label}</Badge>
        </div>
        <CardDescription>
          Control automation authority for this client's engine.
          {!overridesAllowed && (
            <span className="block text-xs mt-1 text-destructive">
              {engine === "athletic"
                ? "Athletic engine: all automation hard-locked."
                : tier === "starter"
                  ? "Upgrade to Pro or above to unlock authority overrides."
                  : "Overrides not available for this engine on Pro tier."}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {AUTHORITY_TOGGLES.map((toggle) => {
          const hardLocked = isToggleHardLocked(engine, toggle.key);
          const disabled = hardLocked || !overridesAllowed;
          const defaultVal = ENGINE_DEFAULTS[engine]?.[toggle.key] ?? false;
          const currentValue = settings?.[toggle.key as keyof AuthoritySettings] as boolean ?? defaultVal;

          return (
            <div key={toggle.key} className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  {toggle.label}
                  {hardLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                </Label>
                <p className="text-xs text-muted-foreground">{toggle.description}</p>
              </div>
              <Switch
                checked={hardLocked ? false : !!currentValue}
                disabled={disabled || toggleMutation.isPending}
                onCheckedChange={(checked) =>
                  toggleMutation.mutate({ key: toggle.key, value: checked })
                }
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
