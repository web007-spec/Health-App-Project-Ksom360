import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Target, Plus, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { GoalCard } from "@/components/GoalCard";
import { CreateGoalDialog } from "@/components/CreateGoalDialog";
import { cn } from "@/lib/utils";

interface Props {
  clientId: string;
  trainerId: string;
  clientName?: string;
}

export function AdminGoalsTab({ clientId, trainerId, clientName = "Client" }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);

  // Fetch goals for this client
  const { data: goals, isLoading } = useQuery({
    queryKey: ["goals-admin", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fitness_goals")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch latest body weight for progress
  const { data: latestWeight } = useQuery({
    queryKey: ["admin-client-latest-weight", clientId],
    queryFn: async () => {
      const { data: metric } = await supabase
        .from("client_metrics")
        .select("id, metric_definitions!inner(name)")
        .eq("client_id", clientId)
        .filter("metric_definitions.name", "eq", "Weight")
        .maybeSingle();
      if (!metric) return null;
      const { data: entry } = await supabase
        .from("metric_entries")
        .select("value")
        .eq("client_metric_id", metric.id)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return entry?.value ?? null;
    },
  });

  // Fetch all goal feature flags from DB
  const { data: featureSettings } = useQuery({
    queryKey: ["client-feature-settings-goals", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_feature_settings")
        .select("goals_enabled, pace_enabled, back_on_pace_enabled, lock_start_weight_after_set, client_can_edit_goal, allow_custom_goal_text")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Update goal status with ended_reason for audit trail
  const updateStatusMutation = useMutation({
    mutationFn: async ({ goalId, status }: { goalId: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "completed") {
        updates.completed_at = new Date().toISOString();
        updates.ended_reason = "completed";
      } else if (status === "paused") {
        updates.ended_reason = "coach_ended";
      }
      // ended_at is auto-stamped by the stamp_goal_end DB trigger
      const { error } = await supabase
        .from("fitness_goals")
        .update(updates)
        .eq("id", goalId)
        .eq("trainer_id", trainerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals-admin", clientId] });
      queryClient.invalidateQueries({ queryKey: ["client-goals"] });
      toast({ title: "Goal updated" });
    },
  });

  // Toggle any flag — all persisted to DB
  const toggleFlagMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const { error } = await supabase
        .from("client_feature_settings")
        .update({ [key]: value })
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-feature-settings-goals", clientId] });
      queryClient.invalidateQueries({ queryKey: ["client-feature-settings", clientId] });
    },
  });

  const activeGoals = goals?.filter(g => g.status === "active") || [];
  const completedGoals = goals?.filter(g => g.status === "completed") || [];

  const flags = featureSettings ?? {
    goals_enabled: true,
    pace_enabled: true,
    back_on_pace_enabled: true,
    lock_start_weight_after_set: true,
    client_can_edit_goal: false,
    allow_custom_goal_text: true,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Goals</h2>
          <p className="text-sm text-muted-foreground">{activeGoals.length} active · {completedGoals.length} completed</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Goal
        </Button>
      </div>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Active</h3>
          {activeGoals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={{ ...goal, today_weight: latestWeight ?? undefined }}
              onStatusChange={(id, status) => updateStatusMutation.mutate({ goalId: id, status })}
              isTrainer
            />
          ))}
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Completed</h3>
          {completedGoals.map(goal => (
            <GoalCard key={goal.id} goal={goal} isTrainer />
          ))}
        </div>
      )}

      {/* Empty */}
      {(!goals || goals.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No goals yet</h3>
            <p className="text-muted-foreground text-sm mb-4">Create a goal for {clientName}</p>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create First Goal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Feature Controls — all persisted to DB */}
      <Collapsible open={controlsOpen} onOpenChange={setControlsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between" size="sm">
            Goal Feature Controls
            <ChevronDown className={cn("h-4 w-4 transition-transform", controlsOpen && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-3">
            <CardContent className="pt-4 space-y-4">
              {([
                { key: "goals_enabled", label: "Goals Enabled", desc: "Show Goals tab to client" },
                { key: "pace_enabled", label: "Pace Tracking", desc: "Show ahead / on pace / behind status" },
                { key: "back_on_pace_enabled", label: "Back-On-Pace Guidance", desc: "Show tomorrow's target weight when behind" },
                { key: "lock_start_weight_after_set", label: "Lock Start Weight", desc: "Prevent editing start weight after it is set" },
                { key: "client_can_edit_goal", label: "Client Can Edit Goal", desc: "Allow client to modify their own goal" },
                { key: "allow_custom_goal_text", label: "Allow Custom Goal Text", desc: "Allow 'Other (Custom)' goal type" },
              ] as const).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">{label}</Label>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Switch
                    checked={(flags as Record<string, boolean>)[key] ?? true}
                    onCheckedChange={(v) => toggleFlagMutation.mutate({ key, value: v })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <CreateGoalDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        clientId={clientId}
        clientName={clientName}
      />
    </div>
  );
}
