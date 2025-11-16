import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Search } from "lucide-react";

interface ExportRecipesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportRecipesDialog({ open, onOpenChange }: ExportRecipesDialogProps) {
  const { user } = useAuth();
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

  const filteredRecipes = recipes?.filter(recipe =>
    recipe.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleExport = () => {
    if (selectedRecipes.length === 0) {
      toast.error("Please select at least one recipe to export");
      return;
    }

    const recipesToExport = recipes?.filter(r => selectedRecipes.includes(r.id));

    if (!recipesToExport) return;

    // Remove trainer-specific data and image URLs
    const exportData = recipesToExport.map(recipe => ({
      name: recipe.name,
      description: recipe.description,
      instructions: recipe.instructions,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fats: recipe.fats,
      prep_time_minutes: recipe.prep_time_minutes,
      cook_time_minutes: recipe.cook_time_minutes,
      servings: recipe.servings,
      tags: recipe.tags,
      // Note: Image URLs are excluded as they're specific to the original trainer's storage
      _metadata: {
        exported_at: new Date().toISOString(),
        recipe_count: recipesToExport.length,
        version: "1.0"
      }
    }));

    // Create and download JSON file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `recipes-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${selectedRecipes.length} recipe(s)`);
    onOpenChange(false);
    setSelectedRecipes([]);
    setSearchQuery("");
  };

  const toggleSelectAll = () => {
    if (filteredRecipes) {
      if (selectedRecipes.length === filteredRecipes.length) {
        setSelectedRecipes([]);
      } else {
        setSelectedRecipes(filteredRecipes.map(r => r.id));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Export Recipes</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Select recipes to export as a shareable JSON file
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
            >
              {selectedRecipes.length === filteredRecipes?.length ? "Deselect All" : "Select All"}
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedRecipes.length} selected
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 border rounded-lg p-2">
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
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">{recipe.name}</h4>
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
                      {recipe.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{recipe.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No recipes found" : "No recipes available"}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={selectedRecipes.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export {selectedRecipes.length} Recipe(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
