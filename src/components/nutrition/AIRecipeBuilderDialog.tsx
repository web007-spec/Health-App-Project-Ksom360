import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Sparkles, Link, FileText, Loader2, Save, RotateCcw } from "lucide-react";

interface AIRecipeBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExtractedRecipe {
  name: string;
  description?: string;
  instructions?: string;
  ingredients?: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  servings?: number;
  tags?: string[];
}

export function AIRecipeBuilderDialog({ open, onOpenChange }: AIRecipeBuilderDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inputMode, setInputMode] = useState<"url" | "text">("url");
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [extractedRecipe, setExtractedRecipe] = useState<ExtractedRecipe | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleGenerate = async () => {
    const payload: { url?: string; text?: string } = {};
    if (inputMode === "url") {
      if (!urlInput.trim()) {
        toast.error("Please enter a URL");
        return;
      }
      payload.url = urlInput.trim();
    } else {
      if (!textInput.trim()) {
        toast.error("Please enter recipe text");
        return;
      }
      payload.text = textInput.trim();
    }

    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-recipe-builder", {
        body: payload,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.recipe) throw new Error("No recipe data returned");

      setExtractedRecipe(data.recipe);
      toast.success("Recipe extracted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to extract recipe");
    } finally {
      setIsExtracting(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!extractedRecipe || !user?.id) throw new Error("Missing data");

      // Combine ingredients into instructions if present
      let fullInstructions = "";
      if (extractedRecipe.ingredients) {
        fullInstructions += "## Ingredients\n" + extractedRecipe.ingredients + "\n\n";
      }
      if (extractedRecipe.instructions) {
        fullInstructions += "## Directions\n" + extractedRecipe.instructions;
      }

      const { error } = await supabase.from("recipes").insert({
        trainer_id: user.id,
        name: extractedRecipe.name,
        description: extractedRecipe.description || null,
        instructions: fullInstructions || extractedRecipe.instructions || null,
        calories: extractedRecipe.calories,
        protein: extractedRecipe.protein,
        carbs: extractedRecipe.carbs,
        fats: extractedRecipe.fats,
        prep_time_minutes: extractedRecipe.prep_time_minutes || null,
        cook_time_minutes: extractedRecipe.cook_time_minutes || null,
        servings: extractedRecipe.servings || 1,
        tags: extractedRecipe.tags || [],
        image_url: null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Recipe saved to your library!");
      handleReset();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save recipe");
    },
  });

  const handleReset = () => {
    setExtractedRecipe(null);
    setUrlInput("");
    setTextInput("");
  };

  const updateField = (field: keyof ExtractedRecipe, value: any) => {
    if (!extractedRecipe) return;
    setExtractedRecipe({ ...extractedRecipe, [field]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Recipe Builder
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Paste a URL or recipe text and AI will extract it into your library
          </p>
        </DialogHeader>

        {!extractedRecipe ? (
          <div className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={inputMode === "url" ? "default" : "outline"}
                size="sm"
                onClick={() => setInputMode("url")}
              >
                <Link className="h-4 w-4 mr-2" />
                URL
              </Button>
              <Button
                variant={inputMode === "text" ? "default" : "outline"}
                size="sm"
                onClick={() => setInputMode("text")}
              >
                <FileText className="h-4 w-4 mr-2" />
                Text
              </Button>
            </div>

            {inputMode === "url" ? (
              <div className="space-y-2">
                <Label>Recipe URL</Label>
                <Input
                  placeholder="https://www.allrecipes.com/recipe/..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Recipe Text</Label>
                <Textarea
                  placeholder="Paste the recipe name, ingredients, instructions, etc."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="min-h-[200px]"
                />
              </div>
            )}

            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                AI will extract the recipe name, ingredients, instructions, macros, and tags automatically.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleGenerate}
              disabled={isExtracting}
              className="w-full"
              size="lg"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Extracting Recipe...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Recipe
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Editable Preview */}
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={extractedRecipe.name}
                  onChange={(e) => updateField("name", e.target.value)}
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={extractedRecipe.description || ""}
                  onChange={(e) => updateField("description", e.target.value)}
                  className="min-h-[60px]"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs">Calories</Label>
                  <Input
                    type="number"
                    value={extractedRecipe.calories}
                    onChange={(e) => updateField("calories", Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Protein (g)</Label>
                  <Input
                    type="number"
                    value={extractedRecipe.protein}
                    onChange={(e) => updateField("protein", Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Carbs (g)</Label>
                  <Input
                    type="number"
                    value={extractedRecipe.carbs}
                    onChange={(e) => updateField("carbs", Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Fats (g)</Label>
                  <Input
                    type="number"
                    value={extractedRecipe.fats}
                    onChange={(e) => updateField("fats", Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Prep (min)</Label>
                  <Input
                    type="number"
                    value={extractedRecipe.prep_time_minutes || ""}
                    onChange={(e) => updateField("prep_time_minutes", Number(e.target.value) || null)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Cook (min)</Label>
                  <Input
                    type="number"
                    value={extractedRecipe.cook_time_minutes || ""}
                    onChange={(e) => updateField("cook_time_minutes", Number(e.target.value) || null)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Servings</Label>
                  <Input
                    type="number"
                    value={extractedRecipe.servings || 1}
                    onChange={(e) => updateField("servings", Number(e.target.value) || 1)}
                  />
                </div>
              </div>

              {extractedRecipe.ingredients && (
                <div>
                  <Label>Ingredients</Label>
                  <Textarea
                    value={extractedRecipe.ingredients}
                    onChange={(e) => updateField("ingredients", e.target.value)}
                    className="min-h-[100px] text-sm"
                  />
                </div>
              )}

              <div>
                <Label>Instructions</Label>
                <Textarea
                  value={extractedRecipe.instructions || ""}
                  onChange={(e) => updateField("instructions", e.target.value)}
                  className="min-h-[100px] text-sm"
                />
              </div>

              {extractedRecipe.tags && extractedRecipe.tags.length > 0 && (
                <div>
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {extractedRecipe.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {extractedRecipe ? (
            <>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Start Over
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save to Library
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
