import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Plus, Trash2, Unlock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CoachPlanOverridesProps {
  clientId: string;
  trainerId: string;
}

export function CoachPlanOverrides({ clientId, trainerId }: CoachPlanOverridesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlanSource, setSelectedPlanSource] = useState<string>("quick_plan");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [reason, setReason] = useState("");

  // Fetch existing overrides
  const { data: overrides = [] } = useQuery({
    queryKey: ["coach-plan-overrides-admin", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_plan_overrides")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch available plans for selection
  const { data: quickPlans = [] } = useQuery({
    queryKey: ["all-quick-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quick_fasting_plans")
        .select("id, name, fast_hours, intensity_tier, min_level_required")
        .order("order_index");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: protocols = [] } = useQuery({
    queryKey: ["all-fasting-protocols"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fasting_protocols")
        .select("id, name, intensity_tier, min_level_required")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const addOverride = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("coach_plan_overrides").insert({
        client_id: clientId,
        coach_id: trainerId,
        plan_id: selectedPlanId,
        plan_source: selectedPlanSource,
        reason: reason.trim() || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedPlanId("");
      setReason("");
      toast({ title: "Plan override added" });
      queryClient.invalidateQueries({ queryKey: ["coach-plan-overrides"] });
      queryClient.invalidateQueries({ queryKey: ["coach-plan-overrides-admin"] });
    },
  });

  const removeOverride = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coach_plan_overrides").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-plan-overrides"] });
      queryClient.invalidateQueries({ queryKey: ["coach-plan-overrides-admin"] });
    },
  });

  const planOptions = selectedPlanSource === "quick_plan" ? quickPlans : protocols;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Unlock className="h-5 w-5" />
          Plan Overrides
        </CardTitle>
        <CardDescription>Unlock locked plans for this client. Overrides bypass level and stability restrictions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add override */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Plan Type</Label>
              <Select value={selectedPlanSource} onValueChange={setSelectedPlanSource}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quick_plan">Quick Plan</SelectItem>
                  <SelectItem value="protocol">Program</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Plan</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select plan..." />
                </SelectTrigger>
                <SelectContent>
                  {planOptions.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.fast_hours ? `(${p.fast_hours}h)` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            maxLength={200}
          />
          <Button
            size="sm"
            disabled={!selectedPlanId || addOverride.isPending}
            onClick={() => addOverride.mutate()}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Override
          </Button>
        </div>

        {/* Active overrides */}
        {overrides.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Active Overrides</Label>
              {overrides.map((o: any) => {
                const planName =
                  o.plan_source === "quick_plan"
                    ? quickPlans.find((p: any) => p.id === o.plan_id)?.name
                    : protocols.find((p: any) => p.id === o.plan_id)?.name;

                return (
                  <div key={o.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{planName || o.plan_id}</p>
                        {o.reason && <p className="text-[10px] text-muted-foreground">{o.reason}</p>}
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {o.plan_source === "quick_plan" ? "Quick" : "Program"}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 shrink-0"
                      onClick={() => removeOverride.mutate(o.id)}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
