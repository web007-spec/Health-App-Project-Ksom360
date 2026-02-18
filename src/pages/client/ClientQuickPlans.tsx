import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Hourglass, UtensilsCrossed } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QuickPlan {
  id: string;
  name: string;
  fast_hours: number;
  eat_hours: number;
  difficulty_group: string;
  order_index: number;
}

const DIFFICULTY_GROUPS = [
  { key: "beginner", label: "Beginner plans" },
  { key: "intermediate", label: "Intermediate plans" },
  { key: "advanced", label: "Advanced plans" },
  { key: "long_fasts", label: "Long fasts" },
];

export default function ClientQuickPlans() {
  const clientId = useEffectiveClientId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<QuickPlan | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["quick-fasting-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quick_fasting_plans")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data as QuickPlan[];
    },
  });

  const selectPlanMutation = useMutation({
    mutationFn: async (plan: QuickPlan) => {
      const { error } = await supabase
        .from("client_feature_settings")
        .update({
          selected_quick_plan_id: plan.id,
          selected_protocol_id: null,
          protocol_start_date: null,
          active_fast_target_hours: plan.fast_hours,
        })
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings"] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting"] });
      toast.success("Quick plan selected!");
      navigate("/client/dashboard");
    },
    onError: () => {
      toast.error("Failed to select plan");
    },
  });

  const grouped = DIFFICULTY_GROUPS.map((group) => ({
    ...group,
    items: plans?.filter((p) => p.difficulty_group === group.key) || [],
  })).filter((g) => g.items.length > 0);

  return (
    <ClientLayout>
      <div className="px-3 pt-4 pb-8 space-y-6 w-full">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/choose-protocol")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Clock className="h-6 w-6 text-blue-400" />
            <h1 className="text-2xl font-bold">Quick Plans</h1>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.key} className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">{group.label}</h2>
              <div className="grid grid-cols-2 gap-3">
                {group.items.map((plan) => (
                  <Card
                    key={plan.id}
                    className="cursor-pointer transition-colors hover:bg-muted/30 border-muted"
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <CardContent className="p-4 space-y-1.5">
                      <h3 className="font-semibold text-base">{plan.name}</h3>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Hourglass className="h-3.5 w-3.5 text-blue-400" />
                        <span>{plan.fast_hours}h</span>
                        {plan.eat_hours > 0 && (
                          <>
                            <span className="mx-0.5">•</span>
                            <UtensilsCrossed className="h-3.5 w-3.5" />
                            <span>{plan.eat_hours}h</span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Plan Detail Dialog */}
      <Dialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
        <DialogContent className="sm:max-w-[420px]">
          {selectedPlan && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedPlan.name}</DialogTitle>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground capitalize">
                      {selectedPlan.difficulty_group.replace("_", " ")}
                    </p>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-2xl font-bold">{selectedPlan.fast_hours}h</p>
                    <p className="text-xs text-muted-foreground">Fasting Window</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-2xl font-bold">
                      {selectedPlan.eat_hours > 0 ? `${selectedPlan.eat_hours}h` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedPlan.eat_hours > 0 ? "Eating Window" : "Extended Fast"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">Ongoing</Badge>
                  <Badge variant="outline" className="text-xs capitalize">
                    {selectedPlan.difficulty_group.replace("_", " ")}
                  </Badge>
                </div>
                <Button
                  className="w-full h-12 text-base"
                  onClick={() => selectPlanMutation.mutate(selectedPlan)}
                  disabled={selectPlanMutation.isPending}
                >
                  {selectPlanMutation.isPending ? "Starting..." : "Ready to Start"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ClientLayout>
  );
}
