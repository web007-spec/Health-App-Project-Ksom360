import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";
import { FlexibleMealPlanBuilder } from "@/components/nutrition/FlexibleMealPlanBuilder";
import { StructuredMealPlanBuilder } from "@/components/nutrition/StructuredMealPlanBuilder";
import { AssignMealPlanDialog } from "@/components/nutrition/AssignMealPlanDialog";

export default function MealPlanDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const { data: mealPlan, isLoading } = useQuery({
    queryKey: ["meal-plan", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("id", id)
        .eq("trainer_id", user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user?.id,
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!mealPlan) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Meal plan not found</p>
          <Button onClick={() => navigate("/meal-plans")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Meal Plans
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/meal-plans")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Meal Plans
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{mealPlan.name}</h1>
            <p className="text-muted-foreground mt-2">{mealPlan.description}</p>
          </div>
          <Button onClick={() => setAssignDialogOpen(true)}>
            <Users className="h-4 w-4 mr-2" />
            Assign to Clients
          </Button>
        </div>

        {mealPlan.plan_type === "flexible" ? (
          <FlexibleMealPlanBuilder mealPlanId={id!} />
        ) : (
          <StructuredMealPlanBuilder mealPlanId={id!} />
        )}
      </div>

      <AssignMealPlanDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        mealPlanId={id!}
      />
    </DashboardLayout>
  );
}
