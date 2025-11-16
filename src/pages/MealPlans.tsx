import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, List } from "lucide-react";
import { CreateMealPlanDialog } from "@/components/nutrition/CreateMealPlanDialog";
import { useNavigate } from "react-router-dom";

export default function MealPlans() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<"flexible" | "structured">("flexible");

  const { data: mealPlans, isLoading } = useQuery({
    queryKey: ["meal-plans", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("trainer_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const flexiblePlans = mealPlans?.filter(p => p.plan_type === "flexible") || [];
  const structuredPlans = mealPlans?.filter(p => p.plan_type === "structured") || [];

  const renderPlanCard = (plan: any) => (
    <Card
      key={plan.id}
      className="cursor-pointer hover:border-primary transition-colors"
      onClick={() => navigate(`/meal-plans/${plan.id}`)}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">{plan.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {plan.description}
            </p>
          </div>
          <Badge variant={plan.plan_type === "flexible" ? "default" : "secondary"}>
            {plan.plan_type === "flexible" ? "Flexible" : "Structured"}
          </Badge>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-sm font-semibold">{plan.target_calories || "–"}</div>
            <div className="text-xs text-muted-foreground">Calories</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold">{plan.target_protein || "–"}g</div>
            <div className="text-xs text-muted-foreground">Protein</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold">{plan.target_carbs || "–"}g</div>
            <div className="text-xs text-muted-foreground">Carbs</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold">{plan.target_fats || "–"}g</div>
            <div className="text-xs text-muted-foreground">Fats</div>
          </div>
        </div>

        <Button size="sm" variant="ghost" className="w-full mt-4">
          View & Edit →
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Meal Plans</h1>
            <p className="text-muted-foreground mt-2">
              Create flexible and structured meal plans for clients
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Meal Plan
          </Button>
        </div>

        <Tabs defaultValue="flexible" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="flexible" className="gap-2">
              <List className="h-4 w-4" />
              Flexible Plans ({flexiblePlans.length})
            </TabsTrigger>
            <TabsTrigger value="structured" className="gap-2">
              <Calendar className="h-4 w-4" />
              Structured Plans ({structuredPlans.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="flexible" className="mt-6">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : flexiblePlans.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {flexiblePlans.map(renderPlanCard)}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <List className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No flexible meal plans yet</p>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    Flexible plans let clients choose from meal options you provide for each meal type
                  </p>
                  <Button onClick={() => {
                    setSelectedType("flexible");
                    setCreateDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Flexible Plan
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="structured" className="mt-6">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : structuredPlans.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {structuredPlans.map(renderPlanCard)}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No structured meal plans yet</p>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    Structured plans assign specific meals to specific dates for detailed guidance
                  </p>
                  <Button onClick={() => {
                    setSelectedType("structured");
                    setCreateDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Structured Plan
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CreateMealPlanDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        initialType={selectedType}
      />
    </DashboardLayout>
  );
}
