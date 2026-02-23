import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Wrench, Layers, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ENGINE_MODE_OPTIONS, type EngineMode } from "@/lib/engineConfig";
import { CoachPlanOverrides } from "./CoachPlanOverrides";

interface ManualOverridesProps {
  clientId: string;
  trainerId: string;
}

export function ManualOverrides({ clientId, trainerId }: ManualOverridesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [levelOverride, setLevelOverride] = useState("");
  const [levelReason, setLevelReason] = useState("");
  const [engineOverride, setEngineOverride] = useState("");
  const [engineReason, setEngineReason] = useState("");

  const { data: settings } = useQuery({
    queryKey: ["cc-client-settings", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("current_level, engine_mode")
        .eq("client_id", clientId)
        .maybeSingle();
      return data;
    },
  });

  const levelMutation = useMutation({
    mutationFn: async () => {
      const newLevel = parseInt(levelOverride);
      if (isNaN(newLevel) || newLevel < 1 || newLevel > 7) throw new Error("Invalid level");

      const oldLevel = settings?.current_level || 1;
      const { error } = await supabase
        .from("client_feature_settings")
        .update({
          current_level: newLevel,
          level_start_date: new Date().toISOString().split("T")[0],
          level_completion_pct: 0,
          level_status: newLevel >= 7 ? "completed" : "active",
        } as any)
        .eq("client_id", clientId);
      if (error) throw error;

      await supabase.from("coach_override_log").insert({
        client_id: clientId,
        coach_id: trainerId,
        override_type: "level",
        old_value: String(oldLevel),
        new_value: String(newLevel),
        reason: levelReason,
      } as any);
    },
    onSuccess: () => {
      toast({ title: "Level updated" });
      setLevelOverride("");
      setLevelReason("");
      queryClient.invalidateQueries({ queryKey: ["cc-client-settings"] });
      queryClient.invalidateQueries({ queryKey: ["level-progression"] });
      queryClient.invalidateQueries({ queryKey: ["cc-activity-log"] });
    },
  });

  const engineMutation = useMutation({
    mutationFn: async () => {
      if (!engineOverride) throw new Error("Select engine");

      const oldEngine = settings?.engine_mode || "metabolic";
      const { error } = await supabase
        .from("client_feature_settings")
        .update({ engine_mode: engineOverride } as any)
        .eq("client_id", clientId);
      if (error) throw error;

      await supabase.from("coach_override_log").insert({
        client_id: clientId,
        coach_id: trainerId,
        override_type: "engine",
        old_value: oldEngine,
        new_value: engineOverride,
        reason: engineReason,
      } as any);
    },
    onSuccess: () => {
      toast({ title: "Engine mode updated" });
      setEngineOverride("");
      setEngineReason("");
      queryClient.invalidateQueries({ queryKey: ["cc-client-settings"] });
      queryClient.invalidateQueries({ queryKey: ["cc-status-overview"] });
      queryClient.invalidateQueries({ queryKey: ["cc-activity-log"] });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Manual Overrides
          </CardTitle>
          <CardDescription>Directly adjust client level or engine mode with logging.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Level Override */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Layers className="h-3.5 w-3.5" /> Level Override
            </Label>
            <p className="text-xs text-muted-foreground">
              Current: Level {settings?.current_level || 1}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Select value={levelOverride} onValueChange={setLevelOverride}>
                <SelectTrigger>
                  <SelectValue placeholder="Set level..." />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7].map((l) => (
                    <SelectItem key={l} value={String(l)}>Level {l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={levelReason}
                onChange={(e) => setLevelReason(e.target.value)}
                placeholder="Reason (required)"
                maxLength={200}
              />
            </div>
            <Button
              size="sm"
              disabled={!levelOverride || !levelReason.trim() || levelMutation.isPending}
              onClick={() => levelMutation.mutate()}
            >
              Apply Level
            </Button>
          </div>

          <Separator />

          {/* Engine Mode Override */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-3.5 w-3.5" /> Engine Mode Override
            </Label>
            <p className="text-xs text-muted-foreground capitalize">
              Current: {settings?.engine_mode || "metabolic"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Select value={engineOverride} onValueChange={setEngineOverride}>
                <SelectTrigger>
                  <SelectValue placeholder="Set engine..." />
                </SelectTrigger>
                <SelectContent>
                  {ENGINE_MODE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={engineReason}
                onChange={(e) => setEngineReason(e.target.value)}
                placeholder="Reason (required)"
                maxLength={200}
              />
            </div>
            <Button
              size="sm"
              disabled={!engineOverride || !engineReason.trim() || engineMutation.isPending}
              onClick={() => engineMutation.mutate()}
            >
              Apply Engine
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Plan Overrides (existing component) */}
      <CoachPlanOverrides clientId={clientId} trainerId={trainerId} />
    </div>
  );
}
