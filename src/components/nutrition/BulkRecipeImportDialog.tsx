import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Sparkles, Save, RotateCcw, CheckCircle2, XCircle, Layers } from "lucide-react";

interface BulkRecipeImportDialogProps {
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

interface RecipeResult {
  recipe: ExtractedRecipe | null;
  status: "pending" | "extracting" | "done" | "error";
  error?: string;
  saved?: boolean;
}

export function BulkRecipeImportDialog({ open, onOpenChange }: BulkRecipeImportDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [textInput, setTextInput] = useState("");
  const [results, setResults] = useState<RecipeResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const splitRecipes = (text: string): string[] => {
    // Split on common dividers: ---, ===, or blank lines between recipes
    const chunks = text
      .split(/\n\s*(?:---+|===+)\s*\n/)
      .map((c) => c.trim())
      .filter((c) => c.length > 20);
    return chunks;
  };

  const handleExtractAll = async () => {
    const chunks = splitRecipes(textInput);
    if (chunks.length === 0) {
      toast.error("No recipes detected. Separate recipes with --- on its own line.");
      return;
    }

    setIsProcessing(true);
    const initialResults: RecipeResult[] = chunks.map(() => ({
      recipe: null,
      status: "pending",
    }));
    setResults(initialResults);

    for (let i = 0; i < chunks.length; i++) {
      setResults((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: "extracting" } : r))
      );

      try {
        const { data, error } = await supabase.functions.invoke("ai-recipe-builder", {
          body: { text: chunks[i] },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (!data?.recipe) throw new Error("No recipe returned");

        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, recipe: data.recipe, status: "done" } : r
          )
        );
      } catch (err: any) {
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? { ...r, status: "error", error: err.message || "Extraction failed" }
              : r
          )
        );
      }

      // Small delay to avoid rate limits
      if (i < chunks.length - 1) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    setIsProcessing(false);
    toast.success(`Finished processing ${chunks.length} recipes`);
  };

  const handleSaveAll = async () => {
    if (!user?.id) return;
    const toSave = results.filter((r) => r.status === "done" && r.recipe && !r.saved);
    if (toSave.length === 0) {
      toast.error("No recipes to save");
      return;
    }

    setIsSaving(true);
    let savedCount = 0;

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status !== "done" || !r.recipe || r.saved) continue;

      let fullInstructions = "";
      if (r.recipe.ingredients) {
        fullInstructions += "## Ingredients\n" + r.recipe.ingredients + "\n\n";
      }
      if (r.recipe.instructions) {
        fullInstructions += "## Directions\n" + r.recipe.instructions;
      }

      const { error } = await supabase.from("recipes").insert({
        trainer_id: user.id,
        name: r.recipe.name,
        description: r.recipe.description || null,
        instructions: fullInstructions || r.recipe.instructions || null,
        calories: r.recipe.calories,
        protein: r.recipe.protein,
        carbs: r.recipe.carbs,
        fats: r.recipe.fats,
        prep_time_minutes: r.recipe.prep_time_minutes || null,
        cook_time_minutes: r.recipe.cook_time_minutes || null,
        servings: r.recipe.servings || 1,
        tags: r.recipe.tags || [],
        image_url: null,
      });

      if (!error) {
        savedCount++;
        setResults((prev) =>
          prev.map((res, idx) => (idx === i ? { ...res, saved: true } : res))
        );
      }
    }

    queryClient.invalidateQueries({ queryKey: ["recipes"] });
    toast.success(`${savedCount} recipes saved to your library!`);
    setIsSaving(false);
  };

  const handleReset = () => {
    setResults([]);
    setTextInput("");
  };

  const doneCount = results.filter((r) => r.status === "done" && !r.saved).length;
  const savedCount = results.filter((r) => r.saved).length;
  const errorCount = results.filter((r) => r.status === "error").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Bulk Recipe Import
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Paste multiple recipes separated by <code className="bg-muted px-1 rounded">---</code> and AI will extract them all
          </p>
        </DialogHeader>

        {results.length === 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Paste all your recipes below</Label>
              <Textarea
                placeholder={`Omad Iron Bowl\n770 Calories, 49g Protein, 12g Carbs, 59g Fat\n1 avocado, hass\n1 tbsp Butter salted\n2 large eggs\n6 oz Beef ground 90% lean\nBrown ground beef thoroughly then drain grease...\n\n---\n\n4-Ingredient Chicken Parmesan\n363 Calories, 42g Protein, 8g Carbs, 18g Fat\n...`}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="min-h-[300px] text-sm font-mono"
              />
            </div>

            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                Copy each recipe's name, macros, ingredients & directions from Trainerize. Separate recipes with <strong>---</strong> on its own line.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleExtractAll}
              disabled={isProcessing || !textInput.trim()}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Extract All Recipes
                </>
              )}
            </Button>
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-1">
            <div className="space-y-3">
              {results.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="shrink-0">
                    {r.status === "pending" && (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                    )}
                    {r.status === "extracting" && (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    )}
                    {r.status === "done" && !r.saved && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                    {r.saved && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                    {r.status === "error" && (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {r.recipe?.name || `Recipe ${i + 1}`}
                    </p>
                    {r.recipe && (
                      <p className="text-xs text-muted-foreground">
                        {r.recipe.calories} cal · P{r.recipe.protein}g · C{r.recipe.carbs}g · F{r.recipe.fats}g
                      </p>
                    )}
                    {r.error && (
                      <p className="text-xs text-destructive">{r.error}</p>
                    )}
                  </div>
                  {r.saved && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      Saved
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="gap-2">
          {results.length > 0 ? (
            <>
              <Button variant="outline" onClick={handleReset} disabled={isProcessing || isSaving}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Start Over
              </Button>
              {doneCount > 0 && (
                <Button onClick={handleSaveAll} disabled={isSaving || isProcessing}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save {doneCount} Recipes
                </Button>
              )}
              {savedCount > 0 && doneCount === 0 && (
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Done
                </Button>
              )}
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
