import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoalCard } from "@/components/GoalCard";
import { CreateGoalDialog } from "@/components/CreateGoalDialog";
import { Plus, Target, Trophy, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

export default function Goals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedClientName, setSelectedClientName] = useState<string>("");

  // Fetch trainer clients
  const { data: clients } = useQuery({
    queryKey: ["trainer-clients", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_clients")
        .select(`
          client_id,
          status,
          client_profile:profiles!client_id (
            full_name
          )
        `)
        .eq("trainer_id", user?.id)
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch goals
  const { data: goals, isLoading } = useQuery({
    queryKey: ["goals", user?.id, selectedClient],
    queryFn: async () => {
      let query = supabase
        .from("fitness_goals")
        .select("*")
        .eq("trainer_id", user?.id)
        .order("created_at", { ascending: false });

      if (selectedClient !== "all") {
        query = query.eq("client_id", selectedClient);
      }

      const { data: goalsData, error } = await query;
      if (error) throw error;

      // Fetch client profiles separately
      if (goalsData && goalsData.length > 0) {
        const clientIds = [...new Set(goalsData.map((g) => g.client_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", clientIds);

        // Merge profile data
        return goalsData.map((goal) => ({
          ...goal,
          client_profile: profiles?.find((p) => p.id === goal.client_id),
        }));
      }

      return goalsData;
    },
    enabled: !!user?.id,
  });

  // Update goal status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ goalId, status }: { goalId: string; status: string }) => {
      // Get goal details for celebration
      const { data: goal } = await supabase
        .from("fitness_goals")
        .select("*")
        .eq("id", goalId)
        .single();

      // Get client profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", goal?.client_id)
        .single();

      const updates: any = { status };
      if (status === "completed") {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("fitness_goals")
        .update(updates)
        .eq("id", goalId)
        .eq("trainer_id", user?.id);

      if (error) throw error;
      
      return { goal, status, clientName: profile?.full_name };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["client-goals"] });
      
      const { goal, status, clientName } = data;
      
      if (status === "completed" && goal) {
        // Trigger celebration for trainer
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        
        toast({
          title: "🎉 Goal Completed!",
          description: `${clientName || "Client"} has achieved their goal: ${goal.title}`,
        });
      } else {
        toast({
          title: "Success",
          description: "Goal status updated",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update goal",
        variant: "destructive",
      });
    },
  });

  const handleCreateGoal = (clientId: string, clientName: string) => {
    setSelectedClient(clientId);
    setSelectedClientName(clientName);
    setCreateDialogOpen(true);
  };

  const handleStatusChange = (goalId: string, status: string) => {
    updateStatusMutation.mutate({ goalId, status });
  };

  const activeGoals = goals?.filter((g) => g.status === "active") || [];
  const completedGoals = goals?.filter((g) => g.status === "completed") || [];

  const totalGoals = goals?.length || 0;
  const completionRate = totalGoals > 0 ? Math.round((completedGoals.length / totalGoals) * 100) : 0;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading goals...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Client Goals</h1>
            <p className="text-muted-foreground mt-1">Set and track fitness goals for your clients</p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients?.map((client) => (
                  <SelectItem key={client.client_id} value={client.client_id}>
                    {client.client_profile?.full_name || "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Goals</p>
                  <h3 className="text-3xl font-bold mt-2">{totalGoals}</h3>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Target className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Goals</p>
                  <h3 className="text-3xl font-bold mt-2">{activeGoals.length}</h3>
                </div>
                <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                  <h3 className="text-3xl font-bold mt-2">{completionRate}%</h3>
                </div>
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        {clients && clients.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Create Goal for Client</h3>
              <div className="flex flex-wrap gap-2">
                {clients.map((client) => (
                  <Button
                    key={client.client_id}
                    variant="outline"
                    onClick={() =>
                      handleCreateGoal(client.client_id, client.client_profile?.full_name || "Unknown")
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {client.client_profile?.full_name || "Unknown"}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Goals Tabs */}
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList>
            <TabsTrigger value="active">Active ({activeGoals.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedGoals.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeGoals.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeGoals.map((goal: any) => (
                  <div key={goal.id} className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {goal.client_profile?.full_name || "Unknown Client"}
                    </p>
                    <GoalCard goal={goal} onStatusChange={handleStatusChange} isTrainer />
                  </div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No active goals</h3>
                  <p className="text-muted-foreground">Create goals for your clients to get started</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedGoals.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedGoals.map((goal: any) => (
                  <div key={goal.id} className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {goal.client_profile?.full_name || "Unknown Client"}
                    </p>
                    <GoalCard goal={goal} isTrainer />
                  </div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No completed goals yet</h3>
                  <p className="text-muted-foreground">Completed goals will appear here</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {selectedClient !== "all" && (
        <CreateGoalDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          clientId={selectedClient}
          clientName={selectedClientName}
        />
      )}
    </DashboardLayout>
  );
}
