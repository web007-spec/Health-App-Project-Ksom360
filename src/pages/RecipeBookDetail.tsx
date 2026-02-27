import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Star, Users } from "lucide-react";
import { AddRecipeToBookDialog } from "@/components/nutrition/AddRecipeToBookDialog";
import { AssignRecipeBookDialog } from "@/components/nutrition/AssignRecipeBookDialog";
import { toast } from "sonner";

export default function RecipeBookDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addRecipeDialogOpen, setAddRecipeDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const { data: recipeBook, isLoading } = useQuery({
    queryKey: ["recipe-book", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe_books")
        .select(`
          *,
          recipe_book_recipes (
            *,
            recipes (*)
          )
        `)
        .eq("id", id)
        .eq("trainer_id", user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user?.id,
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("recipe_books")
        .update({ is_featured: !recipeBook?.is_featured })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-book", id] });
      toast.success(recipeBook?.is_featured ? "Removed from featured" : "Marked as featured");
    },
  });

  const removeRecipeMutation = useMutation({
    mutationFn: async (recipeBookRecipeId: string) => {
      const { error } = await supabase
        .from("recipe_book_recipes")
        .delete()
        .eq("id", recipeBookRecipeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-book", id] });
      toast.success("Recipe removed from book");
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!recipeBook) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Recipe book not found</p>
          <Button onClick={() => navigate("/recipe-books")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Recipe Books
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/recipe-books")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Recipe Books
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">{recipeBook.name}</h1>
              {recipeBook.is_featured && (
                <Badge className="gap-1">
                  <Star className="h-3 w-3 fill-current" />
                  Featured
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">{recipeBook.description}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {recipeBook.recipe_book_recipes?.length || 0} recipes
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => toggleFeaturedMutation.mutate()}
            >
              <Star className="h-4 w-4 mr-2" />
              {recipeBook.is_featured ? "Unfeature" : "Feature"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(true)}
            >
              <Users className="h-4 w-4 mr-2" />
              Assign to Clients
            </Button>
            <Button onClick={() => setAddRecipeDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Recipes
            </Button>
          </div>
        </div>

        {recipeBook.recipe_book_recipes && recipeBook.recipe_book_recipes.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recipeBook.recipe_book_recipes.map((rbr: any) => (
              <Card key={rbr.id}>
                <CardContent className="p-4">
                  {rbr.recipes?.image_url && (
                    <img
                      src={rbr.recipes.image_url}
                      alt={rbr.recipes.name}
                      className="w-full h-40 object-cover rounded-md mb-3"
                    />
                  )}
                  <h3 className="font-semibold text-lg mb-2">{rbr.recipes?.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {rbr.recipes?.calories} cal · P{rbr.recipes?.protein}g · C{rbr.recipes?.carbs}g · F{rbr.recipes?.fats}g
                  </p>

                  {rbr.recipes?.tags && rbr.recipes.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {rbr.recipes.tags.slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => removeRecipeMutation.mutate(rbr.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No recipes in this book yet</p>
              <Button onClick={() => setAddRecipeDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Recipe
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <AddRecipeToBookDialog
        open={addRecipeDialogOpen}
        onOpenChange={setAddRecipeDialogOpen}
        recipeBookId={id!}
      />

      <AssignRecipeBookDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        recipeBookId={id!}
      />
    </DashboardLayout>
  );
}
