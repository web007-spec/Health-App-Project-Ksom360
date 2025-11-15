import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoalCard } from "@/components/GoalCard";
import { Target, Trophy, Pause, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { showBrowserNotification } from "@/lib/notifications";
import confetti from "canvas-confetti";

export default function ClientGoals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch client goals
  const { data: goals, isLoading } = useQuery({
    queryKey: ["client-goals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fitness_goals")
        .select("*")
        .eq("client_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Update goal progress
  const updateProgressMutation = useMutation({
    mutationFn: async ({ goalId, value }: { goalId: string; value: number }) => {
      // Get current goal to check if achievement is reached
      const { data: currentGoal } = await supabase
        .from("fitness_goals")
        .select("*")
        .eq("id", goalId)
        .single();

      const { error } = await supabase
        .from("fitness_goals")
        .update({ current_value: value, updated_at: new Date().toISOString() })
        .eq("id", goalId)
        .eq("client_id", user?.id);

      if (error) throw error;
      
      return { currentGoal, newValue: value };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["client-goals"] });
      
      const { currentGoal, newValue } = data;
      
      // Check if goal is achieved
      if (currentGoal && currentGoal.target_value && newValue >= currentGoal.target_value) {
        const wasNotAchieved = !currentGoal.current_value || currentGoal.current_value < currentGoal.target_value;
        
        if (wasNotAchieved) {
          // Mark goal as completed
          await supabase
            .from("fitness_goals")
            .update({ 
              status: "completed", 
              completed_at: new Date().toISOString() 
            })
            .eq("id", currentGoal.id);
          
          // Trigger celebration
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
          
          // Show browser notification
          showBrowserNotification("🎉 Goal Achieved!", {
            body: `Congratulations! You've achieved your goal: ${currentGoal.title}`,
            icon: "/favicon.ico",
          });
          
          // Show toast with celebration
          toast({
            title: "🎉 Goal Achieved!",
            description: `Amazing work! You've reached your goal: ${currentGoal.title}`,
          });
          
          return;
        }
      }
      
      // Regular progress update toast
      toast({
        title: "Success",
        description: "Progress updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update progress",
        variant: "destructive",
      });
    },
  });

  const handleUpdateProgress = (goalId: string, value: number) => {
    updateProgressMutation.mutate({ goalId, value });
  };

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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Goals</h1>
          <p className="text-muted-foreground mt-1">Track your fitness goals and progress</p>
        </div>

        {goals && goals.length > 0 ? (
          <Tabs defaultValue="active" className="space-y-6">
            <TabsList>
              <TabsTrigger value="active" className="gap-2">
                <Target className="h-4 w-4" />
                Active ({activeGoals.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2">
                <Trophy className="h-4 w-4" />
                Completed ({completedGoals.length})
              </TabsTrigger>
              <TabsTrigger value="paused" className="gap-2">
                <Pause className="h-4 w-4" />
                Paused ({pausedGoals.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {activeGoals.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {activeGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onUpdateProgress={handleUpdateProgress}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No active goals</h3>
                    <p className="text-muted-foreground">
                      Your trainer will set goals to help you stay on track
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedGoals.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {completedGoals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No completed goals yet</h3>
                    <p className="text-muted-foreground">
                      Complete your active goals to see them here
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="paused" className="space-y-4">
              {pausedGoals.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {pausedGoals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Pause className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No paused goals</h3>
                    <p className="text-muted-foreground">
                      Goals that are temporarily paused will appear here
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No goals yet</h3>
              <p className="text-muted-foreground mb-4">
                Your trainer will set personalized fitness goals to help you succeed
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}
