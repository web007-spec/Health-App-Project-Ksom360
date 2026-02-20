import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoalCard } from "@/components/GoalCard";
import { Target, Trophy, Pause } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";

export default function ClientGoals() {
  const clientId = useEffectiveClientId();

  // Fetch client goals
  const { data: goals, isLoading } = useQuery({
    queryKey: ["client-goals", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fitness_goals")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Fetch latest body weight entry for progress
  const { data: latestWeight } = useQuery({
    queryKey: ["client-latest-weight", clientId],
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
    enabled: !!clientId,
  });

  const activeGoals = goals?.filter((g) => g.status === "active") || [];
  const completedGoals = goals?.filter((g) => g.status === "completed") || [];
  const pausedGoals = goals?.filter((g) => g.status === "paused") || [];

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading goals...</p>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="p-4 space-y-6 pb-24">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Goals</h1>
          <p className="text-muted-foreground text-sm mt-1">Track your progress toward what matters most</p>
        </div>

        {goals && goals.length > 0 ? (
          <Tabs defaultValue="active" className="space-y-4">
            <TabsList className="w-full">
              <TabsTrigger value="active" className="flex-1 gap-1.5">
                <Target className="h-3.5 w-3.5" />
                Active ({activeGoals.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex-1 gap-1.5">
                <Trophy className="h-3.5 w-3.5" />
                Done ({completedGoals.length})
              </TabsTrigger>
              <TabsTrigger value="paused" className="flex-1 gap-1.5">
                <Pause className="h-3.5 w-3.5" />
                Paused ({pausedGoals.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {activeGoals.length > 0 ? (
                <div className="space-y-4">
                  {activeGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={{ ...goal, today_weight: latestWeight ?? undefined }}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No active goals</h3>
                    <p className="text-muted-foreground text-sm">
                      Your trainer will set goals to help you stay on track
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedGoals.length > 0 ? (
                <div className="space-y-4">
                  {completedGoals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No completed goals yet</h3>
                    <p className="text-muted-foreground text-sm">
                      Complete your active goals to see them here
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="paused" className="space-y-4">
              {pausedGoals.length > 0 ? (
                <div className="space-y-4">
                  {pausedGoals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Pause className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No paused goals</h3>
                    <p className="text-muted-foreground text-sm">
                      Goals that are temporarily paused will appear here
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No goals yet</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                Your trainer will set personalized goals to help you succeed
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}
