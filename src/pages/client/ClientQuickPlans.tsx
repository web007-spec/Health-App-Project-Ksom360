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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Target, Users, Utensils, Info, Zap } from "lucide-react";

interface PlanDescription {
  subtitle?: string;
  how_it_works?: string;
  benefits?: string[];
  daily_structure?: {
    stop_eating?: string;
    break_fast?: string;
    meals?: string[];
    note?: string;
  };
  focus?: string;
  who_for?: string[];
  length?: string;
}

interface QuickPlan {
  id: string;
  name: string;
  fast_hours: number;
  eat_hours: number;
  difficulty_group: string;
  order_index: number;
  description: PlanDescription | null;
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
    mutationFn: async ({ plan, startNow }: { plan: QuickPlan; startNow: boolean }) => {
      const updates: Record<string, any> = {
        selected_quick_plan_id: plan.id,
        selected_protocol_id: null,
        protocol_start_date: null,
        active_fast_target_hours: plan.fast_hours,
      };
      if (startNow) {
        updates.active_fast_start_at = new Date().toISOString();
        updates.last_fast_ended_at = null;
        updates.eating_window_ends_at = null;
      }
      const { error } = await supabase
        .from("client_feature_settings")
        .update(updates)
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: (_, { startNow }) => {
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings"] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting"] });
      queryClient.invalidateQueries({ queryKey: ["fasting-gate-state"] });
      toast.success(startNow ? "Fast started!" : "Quick plan selected!");
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
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
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
        <DialogContent className="sm:max-w-[460px] max-h-[85vh] p-0">
          {selectedPlan && (
            <ScrollArea className="max-h-[80vh]">
              <div className="p-6 space-y-5">
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl">{selectedPlan.name}</DialogTitle>
                      {selectedPlan.description?.subtitle && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {selectedPlan.description.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                </DialogHeader>

                {/* Protocol Stats */}
                <div className="rounded-xl bg-muted/50 p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Info className="h-4 w-4" /> Protocol Stats
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-background p-3 text-center">
                      <p className="text-2xl font-bold">{selectedPlan.fast_hours}h</p>
                      <p className="text-xs text-muted-foreground">Fasting Window</p>
                    </div>
                    <div className="rounded-lg bg-background p-3 text-center">
                      <p className="text-2xl font-bold">
                        {selectedPlan.eat_hours > 0 ? `${selectedPlan.eat_hours}h` : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedPlan.eat_hours > 0 ? "Eating Window" : "Extended Fast"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Badge variant="secondary" className="text-xs capitalize">
                      {selectedPlan.difficulty_group.replace("_", " ")}
                    </Badge>
                    {selectedPlan.description?.length && (
                      <Badge variant="outline" className="text-xs">
                        {selectedPlan.description.length}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* How It Works */}
                {selectedPlan.description?.how_it_works && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold flex items-center gap-1.5">
                        <Zap className="h-4 w-4 text-blue-400" /> How This Plan Works
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {selectedPlan.description.how_it_works}
                      </p>
                      {selectedPlan.description.benefits && selectedPlan.description.benefits.length > 0 && (
                        <ul className="space-y-1.5 mt-2">
                          {selectedPlan.description.benefits.map((b, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                              {b}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}

                {/* Daily Structure */}
                {selectedPlan.description?.daily_structure && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold flex items-center gap-1.5">
                        <Utensils className="h-4 w-4 text-blue-400" /> Daily Structure
                      </h3>
                      <div className="rounded-lg bg-muted/50 p-3 space-y-2 text-sm">
                        {selectedPlan.description.daily_structure.stop_eating && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Stop Eating</span>
                            <span className="font-medium">{selectedPlan.description.daily_structure.stop_eating}</span>
                          </div>
                        )}
                        {selectedPlan.description.daily_structure.break_fast && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Break Fast</span>
                            <span className="font-medium">{selectedPlan.description.daily_structure.break_fast}</span>
                          </div>
                        )}
                        {selectedPlan.description.daily_structure.meals && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Meals</span>
                            <span className="font-medium">{selectedPlan.description.daily_structure.meals.join(", ")}</span>
                          </div>
                        )}
                      </div>
                      {selectedPlan.description.daily_structure.note && (
                        <p className="text-xs text-muted-foreground italic">
                          {selectedPlan.description.daily_structure.note}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Focus */}
                {selectedPlan.description?.focus && (
                  <>
                    <Separator />
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-semibold flex items-center gap-1.5">
                        <Target className="h-4 w-4 text-blue-400" /> Focus
                      </h3>
                      <p className="text-sm text-muted-foreground">{selectedPlan.description.focus}</p>
                    </div>
                  </>
                )}

                {/* Who This Is For */}
                {selectedPlan.description?.who_for && selectedPlan.description.who_for.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-blue-400" /> Who This Is For
                      </h3>
                      <ul className="space-y-1.5">
                        {selectedPlan.description.who_for.map((w, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {/* Coach Guidance */}
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-blue-400" /> Coach Guidance
                  </h3>
                  <ul className="space-y-1.5">
                    {[
                      "Stay hydrated during fasting hours",
                      "Begin meals with protein",
                      "Reduce late-night snacking",
                      "Prioritize consistent sleep timing",
                    ].map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Buttons */}
                <Separator />
                <div className="space-y-2 pb-1">
                  <Button
                    className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => selectPlanMutation.mutate({ plan: selectedPlan, startNow: true })}
                    disabled={selectPlanMutation.isPending}
                  >
                    {selectPlanMutation.isPending ? "Starting..." : "Start Fast Now"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-10 text-sm border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                    onClick={() => selectPlanMutation.mutate({ plan: selectedPlan, startNow: false })}
                    disabled={selectPlanMutation.isPending}
                  >
                    Save plan for later
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full h-10 text-sm text-blue-400/70 hover:text-blue-300 hover:bg-blue-500/10"
                    onClick={() => setSelectedPlan(null)}
                  >
                    See All Quick Plans
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </ClientLayout>
  );
}
