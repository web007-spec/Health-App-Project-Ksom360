import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings2, Plus, BookOpen, ChefHat, AlertCircle } from "lucide-react";
import { FlexibleMealPlanBuilder } from "@/components/nutrition/FlexibleMealPlanBuilder";
import { StructuredMealPlanBuilder } from "@/components/nutrition/StructuredMealPlanBuilder";
import { toast } from "sonner";
import { AssignMealPlanDialog } from "@/components/nutrition/AssignMealPlanDialog";
import { AssignRecipeBookDialog } from "@/components/nutrition/AssignRecipeBookDialog";

interface ClientMealPlanTabProps {
  clientId: string;
  trainerId: string;
}

export function ClientMealPlanTab({ clientId, trainerId }: ClientMealPlanTabProps) {
  const queryClient = useQueryClient();
  const [assignMealPlanOpen, setAssignMealPlanOpen] = useState(false);
  const [assignRecipeBookOpen, setAssignRecipeBookOpen] = useState(false);

  // Fetch client feature settings to know which meal plan type is configured
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["client-feature-settings", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_feature_settings")
        .select("*")
        .eq("client_id", clientId)
        .eq("trainer_id", trainerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch client's meal plan assignment
  const { data: mealAssignment } = useQuery({
    queryKey: ["client-meal-assignment", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_meal_plan_assignments")
        .select("*, meal_plans(*)")
        .eq("client_id", clientId)
        .eq("trainer_id", trainerId)
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch trainer's meal plans for assigning
  const { data: trainerMealPlans } = useQuery({
    queryKey: ["trainer-meal-plans", trainerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("trainer_id", trainerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch client's recipe book assignments
  const { data: recipeBookAssignments } = useQuery({
    queryKey: ["client-recipe-books", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_recipe_book_assignments")
        .select("*, recipe_books(*, recipe_book_recipes(*, recipes(*)))")
        .eq("client_id", clientId)
        .eq("trainer_id", trainerId);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch trainer's recipe books for assigning
  const { data: trainerRecipeBooks } = useQuery({
    queryKey: ["trainer-recipe-books", trainerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe_books")
        .select("*")
        .eq("trainer_id", trainerId);
      if (error) throw error;
      return data || [];
    },
  });

  const addWeekMutation = useMutation({
    mutationFn: async () => {
      if (!mealAssignment?.meal_plan_id) return;
      const { error } = await supabase
        .from("meal_plans")
        .update({ num_weeks: (mealAssignment.meal_plans?.num_weeks || 1) + 1 })
        .eq("id", mealAssignment.meal_plan_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-meal-assignment"] });
      toast.success("Week added");
    },
  });

  const removeRecipeBookMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("client_recipe_book_assignments")
        .delete()
        .eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-recipe-books"] });
      toast.success("Recipe book removed");
    },
  });

  const mealPlanType = settings?.meal_plan_type || "none";
  const showMealPlan = mealPlanType === "structured" || mealPlanType === "flexible";
  const showRecipeBooks = mealPlanType === "recipe_books" || settings?.meal_plan_add_recipe_books;
  const headerLabel = settings?.meal_plan_header_label || "Meal Plan";

  if (settingsLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (mealPlanType === "none") {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-semibold">Meal Plan Not Enabled</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Enable a meal plan type in this client's Settings tab to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Build sub-tabs dynamically based on what's enabled
  const subTabs: { value: string; label: string }[] = [];
  if (showMealPlan) {
    subTabs.push({
      value: "meal-plan",
      label: mealPlanType === "flexible" ? "Flexible Meal Plan" : "Structured Meal Plan",
    });
  }
  if (showRecipeBooks) {
    subTabs.push({ value: "recipe-books", label: "Recipe Books" });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{headerLabel}</h2>
      </div>

      <Tabs defaultValue={subTabs[0]?.value} className="space-y-4">
        {subTabs.length > 1 && (
          <TabsList>
            {subTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        )}

        {/* Meal Plan Content */}
        {showMealPlan && (
          <TabsContent value="meal-plan">
            {mealAssignment?.meal_plan_id ? (
              <>
                {mealPlanType === "flexible" && (
                  <FlexibleMealPlanBuilder
                    mealPlanId={mealAssignment.meal_plan_id}
                    numWeeks={mealAssignment.meal_plans?.num_weeks || 1}
                    onAddWeek={() => addWeekMutation.mutate()}
                  />
                )}
                {mealPlanType === "structured" && (
                  <StructuredMealPlanBuilder
                    mealPlanId={mealAssignment.meal_plan_id}
                    numWeeks={mealAssignment.meal_plans?.num_weeks || 1}
                    onAddWeek={() => addWeekMutation.mutate()}
                  />
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center space-y-4">
                  <ChefHat className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold">No Meal Plan Assigned</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Assign a {mealPlanType} meal plan to this client from your Meal Plans library.
                    </p>
                  </div>
                  {trainerMealPlans && trainerMealPlans.length > 0 ? (
                    <div className="space-y-3 max-w-md mx-auto">
                      <p className="text-sm font-medium">Select a meal plan to assign:</p>
                      {trainerMealPlans
                        .filter(mp => mp.plan_type === mealPlanType)
                        .map((mp) => (
                          <AssignMealPlanCard
                            key={mp.id}
                            mealPlan={mp}
                            clientId={clientId}
                            trainerId={trainerId}
                          />
                        ))}
                      {trainerMealPlans.filter(mp => mp.plan_type === mealPlanType).length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No {mealPlanType} meal plans found. Create one in the Meal Plans section first.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Create a meal plan in the Meal Plans section first.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Recipe Books Content */}
        {showRecipeBooks && (
          <TabsContent value="recipe-books">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Assigned Recipe Books</h3>
                {trainerRecipeBooks && trainerRecipeBooks.length > 0 && (
                  <AssignRecipeBookInline
                    trainerRecipeBooks={trainerRecipeBooks}
                    existingAssignments={recipeBookAssignments || []}
                    clientId={clientId}
                    trainerId={trainerId}
                  />
                )}
              </div>

              {recipeBookAssignments && recipeBookAssignments.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {recipeBookAssignments.map((assignment: any) => {
                    const book = assignment.recipe_books;
                    const recipeCount = book?.recipe_book_recipes?.length || 0;
                    return (
                      <Card key={assignment.id}>
                        <CardContent className="p-4">
                          {book?.cover_image_url ? (
                            <img
                              src={book.cover_image_url}
                              alt={book.name}
                              className="w-full h-32 object-cover rounded-md mb-3"
                            />
                          ) : (
                            <div className="w-full h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-md mb-3 flex items-center justify-center">
                              <BookOpen className="h-12 w-12 text-primary/40" />
                            </div>
                          )}
                          <h4 className="font-semibold mb-1">{book?.name}</h4>
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {book?.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {recipeCount} recipe{recipeCount !== 1 ? "s" : ""}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeRecipeBookMutation.mutate(assignment.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center space-y-4">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold">No Recipe Books Assigned</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Assign recipe books for this client to browse.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// Inline component for assigning a meal plan from a card
function AssignMealPlanCard({
  mealPlan,
  clientId,
  trainerId,
}: {
  mealPlan: any;
  clientId: string;
  trainerId: string;
}) {
  const queryClient = useQueryClient();

  const assignMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("client_meal_plan_assignments")
        .insert({
          client_id: clientId,
          trainer_id: trainerId,
          meal_plan_id: mealPlan.id,
          plan_type: mealPlan.plan_type,
          start_date: new Date().toISOString().split("T")[0],
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-meal-assignment"] });
      toast.success("Meal plan assigned!");
    },
    onError: () => {
      toast.error("Failed to assign meal plan");
    },
  });

  return (
    <Card
      className="cursor-pointer hover:border-primary transition-colors"
      onClick={() => assignMutation.mutate()}
    >
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-sm">{mealPlan.name}</h4>
          <p className="text-xs text-muted-foreground">
            {mealPlan.num_weeks} week{mealPlan.num_weeks > 1 ? "s" : ""} · {mealPlan.status}
          </p>
        </div>
        <Button size="sm" disabled={assignMutation.isPending}>
          {assignMutation.isPending ? "Assigning..." : "Assign"}
        </Button>
      </CardContent>
    </Card>
  );
}

// Inline component for assigning recipe books
function AssignRecipeBookInline({
  trainerRecipeBooks,
  existingAssignments,
  clientId,
  trainerId,
}: {
  trainerRecipeBooks: any[];
  existingAssignments: any[];
  clientId: string;
  trainerId: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const assignedBookIds = existingAssignments.map((a: any) => a.recipe_book_id);
  const unassignedBooks = trainerRecipeBooks.filter((b) => !assignedBookIds.includes(b.id));

  const assignMutation = useMutation({
    mutationFn: async (recipeBookId: string) => {
      const { error } = await supabase
        .from("client_recipe_book_assignments")
        .insert({
          client_id: clientId,
          trainer_id: trainerId,
          recipe_book_id: recipeBookId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-recipe-books"] });
      toast.success("Recipe book assigned!");
    },
    onError: () => {
      toast.error("Failed to assign recipe book");
    },
  });

  if (unassignedBooks.length === 0) return null;

  return (
    <div className="relative">
      <Button size="sm" onClick={() => setOpen(!open)}>
        <Plus className="h-4 w-4 mr-1" /> Add Recipe Book
      </Button>
      {open && (
        <Card className="absolute right-0 top-10 z-10 w-72 shadow-lg">
          <CardContent className="p-2 space-y-1 max-h-64 overflow-y-auto">
            {unassignedBooks.map((book) => (
              <div
                key={book.id}
                className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer"
                onClick={() => {
                  assignMutation.mutate(book.id);
                  setOpen(false);
                }}
              >
                <span className="text-sm font-medium">{book.name}</span>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
