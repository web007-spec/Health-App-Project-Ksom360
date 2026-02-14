import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Settings, Check } from "lucide-react";
import { FlexibleMealPlanBuilder } from "@/components/nutrition/FlexibleMealPlanBuilder";
import { StructuredMealPlanBuilder } from "@/components/nutrition/StructuredMealPlanBuilder";
import { AssignMealPlanDialog } from "@/components/nutrition/AssignMealPlanDialog";
import { toast } from "sonner";

export default function MealPlanDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  const addWeekMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("meal_plans")
        .update({ num_weeks: (mealPlan?.num_weeks || 1) + 1 })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plan", id] });
      toast.success("Week added!");
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const newStatus = mealPlan?.status === "published" ? "draft" : "published";
      const { error } = await supabase
        .from("meal_plans")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ["meal-plan", id] });
      toast.success(newStatus === "published" ? "Meal plan published!" : "Meal plan set to draft");
    },
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
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">{mealPlan.name}</h1>
              <Badge variant={mealPlan.status === "published" ? "default" : "secondary"}>
                {mealPlan.status === "published" ? "Published" : "Draft"}
              </Badge>
              <Badge variant="outline" className="capitalize">{mealPlan.plan_type}</Badge>
            </div>
            <p className="text-muted-foreground mt-2">{mealPlan.description}</p>
            {(mealPlan.target_calories || mealPlan.target_protein) && (
              <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                {mealPlan.target_calories && <span>Target: {mealPlan.target_calories} cal</span>}
                {mealPlan.target_protein && <span>P {mealPlan.target_protein}g</span>}
                {mealPlan.target_carbs && <span>C {mealPlan.target_carbs}g</span>}
                {mealPlan.target_fats && <span>F {mealPlan.target_fats}g</span>}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant={mealPlan.status === "published" ? "outline" : "default"}
              onClick={() => publishMutation.mutate()}
            >
              <Check className="h-4 w-4 mr-2" />
              {mealPlan.status === "published" ? "Unpublish" : "Publish"}
            </Button>
            <Button variant="outline" onClick={() => setAssignDialogOpen(true)}>
              <Users className="h-4 w-4 mr-2" />
              Assign
            </Button>
          </div>
        </div>

        {mealPlan.plan_type === "flexible" ? (
          <FlexibleMealPlanBuilder
            mealPlanId={id!}
            numWeeks={mealPlan.num_weeks || 1}
            onAddWeek={() => addWeekMutation.mutate()}
          />
        ) : (
          <StructuredMealPlanBuilder
            mealPlanId={id!}
            numWeeks={mealPlan.num_weeks || 1}
            onAddWeek={() => addWeekMutation.mutate()}
          />
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
