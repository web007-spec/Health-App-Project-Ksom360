import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, Download, Upload, Sparkles, Layers } from "lucide-react";
import { CreateRecipeDialog } from "@/components/nutrition/CreateRecipeDialog";
import { EditRecipeDialog } from "@/components/nutrition/EditRecipeDialog";
import { DeleteRecipeDialog } from "@/components/nutrition/DeleteRecipeDialog";
import { ExportRecipesDialog } from "@/components/nutrition/ExportRecipesDialog";
import { ImportRecipesDialog } from "@/components/nutrition/ImportRecipesDialog";
import { AIRecipeBuilderDialog } from "@/components/nutrition/AIRecipeBuilderDialog";
import { BulkRecipeImportDialog } from "@/components/nutrition/BulkRecipeImportDialog";

export default function Recipes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<any>(null);
  const [deletingRecipe, setDeletingRecipe] = useState<any>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [aiBuilderOpen, setAiBuilderOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  const { data: recipes, isLoading } = useQuery({
    queryKey: ["recipes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("trainer_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const filteredRecipes = recipes?.filter(recipe =>
    recipe.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Recipes</h1>
            <p className="text-muted-foreground mt-2">
              Create and manage your recipe library
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setAiBuilderOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              AI Recipe Builder
            </Button>
            <Button variant="outline" onClick={() => setBulkImportOpen(true)}>
              <Layers className="h-4 w-4 mr-2" />
              Bulk Import
            </Button>
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" onClick={() => setExportDialogOpen(true)}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Recipe
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recipes by name or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading recipes...</div>
        ) : filteredRecipes && filteredRecipes.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRecipes.map((recipe) => (
              <Card key={recipe.id} className="hover:border-primary transition-colors cursor-pointer" onClick={() => navigate(`/recipes/${recipe.id}`)}>
                <CardContent className="p-4">
                  {recipe.image_url && (
                    <img
                      src={recipe.image_url}
                      alt={recipe.name}
                      className="w-full h-40 object-cover rounded-md mb-3"
                    />
                  )}
                  <h3 className="font-semibold text-lg mb-2">{recipe.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {recipe.description}
                  </p>

                  <div className="flex items-center justify-between text-sm mb-3">
                    <span>{recipe.calories} cal</span>
                    <span>P{recipe.protein}g · C{recipe.carbs}g · F{recipe.fats}g</span>
                  </div>

                  {recipe.tags && recipe.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {recipe.tags.slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {recipe.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{recipe.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setEditingRecipe(recipe)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeletingRecipe(recipe)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "No recipes found matching your search" : "No recipes yet"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Recipe
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <CreateRecipeDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {editingRecipe && (
        <EditRecipeDialog
          recipe={editingRecipe}
          open={!!editingRecipe}
          onOpenChange={(open) => !open && setEditingRecipe(null)}
        />
      )}

      {deletingRecipe && (
        <DeleteRecipeDialog
          recipe={deletingRecipe}
          open={!!deletingRecipe}
          onOpenChange={(open) => !open && setDeletingRecipe(null)}
        />
      )}

      <ExportRecipesDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
      />

      <ImportRecipesDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />

      <AIRecipeBuilderDialog
        open={aiBuilderOpen}
        onOpenChange={setAiBuilderOpen}
      />

      <BulkRecipeImportDialog
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
      />
    </DashboardLayout>
  );
}
