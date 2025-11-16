import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search } from "lucide-react";

interface AddRecipeToBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeBookId: string;
}

export function AddRecipeToBookDialog({ open, onOpenChange, recipeBookId }: AddRecipeToBookDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);

  const { data: recipes } = useQuery({
    queryKey: ["recipes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("trainer_id", user?.id)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  const { data: existingRecipes } = useQuery({
    queryKey: ["recipe-book-recipes", recipeBookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe_book_recipes")
        .select("recipe_id")
        .eq("recipe_book_id", recipeBookId);

      if (error) throw error;
      return data.map(r => r.recipe_id);
    },
    enabled: !!recipeBookId && open,
  });

  const filteredRecipes = recipes?.filter(recipe =>
    !existingRecipes?.includes(recipe.id) &&
    recipe.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addRecipesMutation = useMutation({
    mutationFn: async () => {
      const inserts = selectedRecipes.map((recipeId, index) => ({
        recipe_book_id: recipeBookId,
        recipe_id: recipeId,
        order_index: index,
      }));

      const { error } = await supabase
        .from("recipe_book_recipes")
        .insert(inserts);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-book"] });
      toast.success(`Added ${selectedRecipes.length} recipe(s) to book`);
      onOpenChange(false);
      setSelectedRecipes([]);
      setSearchQuery("");
    },
    onError: () => {
      toast.error("Failed to add recipes");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Recipes to Book</DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredRecipes && filteredRecipes.length > 0 ? (
            filteredRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent cursor-pointer"
                onClick={() => {
                  setSelectedRecipes(prev =>
                    prev.includes(recipe.id)
                      ? prev.filter(id => id !== recipe.id)
                      : [...prev, recipe.id]
                  );
                }}
              >
                <Checkbox
                  checked={selectedRecipes.includes(recipe.id)}
                  onCheckedChange={(checked) => {
                    setSelectedRecipes(prev =>
                      checked
                        ? [...prev, recipe.id]
                        : prev.filter(id => id !== recipe.id)
                    );
                  }}
                />
                <div className="flex-1">
                  <h4 className="font-semibold">{recipe.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {recipe.calories} cal · P{recipe.protein}g · C{recipe.carbs}g · F{recipe.fats}g
                  </p>
                  {recipe.tags && recipe.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {recipe.tags.slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No recipes found" : "All recipes already added to this book"}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => addRecipesMutation.mutate()}
            disabled={selectedRecipes.length === 0 || addRecipesMutation.isPending}
          >
            {addRecipesMutation.isPending
              ? "Adding..."
              : `Add ${selectedRecipes.length} Recipe(s)`
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
