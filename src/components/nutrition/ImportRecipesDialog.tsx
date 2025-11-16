import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileJson, AlertCircle, CheckCircle } from "lucide-react";
import { z } from "zod";

interface ImportRecipesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const recipeImportSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  instructions: z.string().max(5000).optional().nullable(),
  calories: z.number().min(0).max(10000),
  protein: z.number().min(0).max(1000),
  carbs: z.number().min(0).max(1000),
  fats: z.number().min(0).max(1000),
  prep_time_minutes: z.number().min(0).max(1440).optional().nullable(),
  cook_time_minutes: z.number().min(0).max(1440).optional().nullable(),
  servings: z.number().min(1).max(100).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
});

export function ImportRecipesDialog({ open, onOpenChange }: ImportRecipesDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast.error("Please select a JSON file");
      return;
    }

    setFileName(file.name);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate that it's an array
      if (!Array.isArray(data)) {
        throw new Error("Invalid format: Expected an array of recipes");
      }

      // Validate each recipe
      const errors: string[] = [];
      const validRecipes: any[] = [];

      data.forEach((recipe, index) => {
        try {
          const validated = recipeImportSchema.parse(recipe);
          validRecipes.push(validated);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(`Recipe ${index + 1}: ${error.errors.map(e => e.message).join(", ")}`);
          }
        }
      });

      if (validRecipes.length === 0) {
        throw new Error("No valid recipes found in file");
      }

      setPreviewData(validRecipes);
      setValidationErrors(errors);

      if (errors.length > 0) {
        toast.warning(`Found ${errors.length} invalid recipe(s), they will be skipped`);
      } else {
        toast.success(`Found ${validRecipes.length} valid recipe(s) ready to import`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to parse file");
      setPreviewData(null);
      setValidationErrors([]);
    }
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!previewData || previewData.length === 0) {
        throw new Error("No recipes to import");
      }

      const recipesToInsert = previewData.map(recipe => ({
        trainer_id: user?.id!,
        name: recipe.name,
        description: recipe.description,
        instructions: recipe.instructions,
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fats: recipe.fats,
        prep_time_minutes: recipe.prep_time_minutes,
        cook_time_minutes: recipe.cook_time_minutes,
        servings: recipe.servings || 1,
        tags: recipe.tags,
        image_url: null, // Images must be uploaded separately
      }));

      const { error } = await supabase
        .from("recipes")
        .insert(recipesToInsert);

      if (error) throw error;

      return recipesToInsert.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast.success(`Successfully imported ${count} recipe(s)!`);
      onOpenChange(false);
      handleReset();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to import recipes");
    },
  });

  const handleReset = () => {
    setPreviewData(null);
    setValidationErrors([]);
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) handleReset();
    }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Recipes</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Upload a recipe JSON file exported from another trainer
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {!previewData ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-dashed"
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div className="text-sm font-medium">Click to upload recipe file</div>
                  <div className="text-xs text-muted-foreground">JSON files only</div>
                </div>
              </Button>

              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Note:</strong> Recipe images are not included in exports. 
                  You'll need to upload images separately after importing.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-accent">
                <FileJson className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {previewData.length} recipe(s) ready to import
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                >
                  Change File
                </Button>
              </div>

              {validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-2">
                      {validationErrors.length} recipe(s) will be skipped due to validation errors:
                    </p>
                    <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                      {validationErrors.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Recipes to Import
                </h4>
                <div className="space-y-2">
                  {previewData.map((recipe, index) => (
                    <div key={index} className="p-2 border rounded">
                      <p className="font-medium text-sm">{recipe.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {recipe.calories} cal · P{recipe.protein}g · C{recipe.carbs}g · F{recipe.fats}g
                      </p>
                      {recipe.tags && recipe.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {recipe.tags.map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {previewData && (
            <Button
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending
                ? "Importing..."
                : `Import ${previewData.length} Recipe(s)`
              }
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
