import { useState, useRef } from "react";
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
import { Loader2, Sparkles, Save, RotateCcw, CheckCircle2, XCircle, Layers, FileUp, FileText } from "lucide-react";

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

export function BulkRecipeImportDialog({ open, onOpenChange }: BulkRecipeImportDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inputMode, setInputMode] = useState<"text" | "pdf">("text");
  const [textInput, setTextInput] = useState("");
  const [pdfFileNames, setPdfFileNames] = useState<string[]>([]);
  const [pdfText, setPdfText] = useState("");
  const pdfTextRef = useRef("");
  const [recipes, setRecipes] = useState<(ExtractedRecipe & { saved?: boolean })[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(f => f.type === "application/pdf");
    if (validFiles.length === 0) {
      toast.error("Please upload PDF files");
      return;
    }

    setPdfFileNames(prev => [...prev, ...validFiles.map(f => f.name)]);

    try {
      let allText = pdfTextRef.current;
      for (const file of validFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.min.mjs" as any);
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs";
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = "";
        for (let i = 1; i <= Math.min(pdf.numPages, 50); i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item: any) => item.str).join(" ") + "\n";
        }
        if (allText.trim()) allText += "\n\n";
        allText += text.trim();
      }
      pdfTextRef.current = allText;
      setPdfText(allText);
      toast.success(`Extracted text from ${validFiles.length} PDF(s)`);
    } catch {
      toast.error("Failed to read one or more PDFs. Try pasting the text instead.");
    }
    // Reset input so the same or new files can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExtractAll = async () => {
    const sourceText = inputMode === "pdf" ? pdfText : textInput;
    if (!sourceText.trim()) {
      toast.error(inputMode === "pdf" ? "Please upload a PDF first" : "No text entered");
      return;
    }

    setIsProcessing(true);
    setError("");
    setRecipes([]);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-recipe-builder", {
        body: { text: sourceText, bulk: true },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      if (!data?.recipes || data.recipes.length === 0) {
        throw new Error("No recipes found in the provided text");
      }

      setRecipes(data.recipes);
      toast.success(`Found ${data.recipes.length} recipes!`);
    } catch (err: any) {
      setError(err.message || "Extraction failed");
      toast.error(err.message || "Extraction failed");
    }

    setIsProcessing(false);
  };

  const handleSaveAll = async () => {
    if (!user?.id) return;
    const toSave = recipes.filter((r) => !r.saved);
    if (toSave.length === 0) {
      toast.error("No recipes to save");
      return;
    }

    setIsSaving(true);
    let savedCount = 0;

    for (let i = 0; i < recipes.length; i++) {
      const r = recipes[i];
      if (r.saved) continue;

      let fullInstructions = "";
      if (r.ingredients) {
        fullInstructions += "## Ingredients\n" + r.ingredients + "\n\n";
      }
      if (r.instructions) {
        fullInstructions += "## Directions\n" + r.instructions;
      }

      const { error } = await supabase.from("recipes").insert({
        trainer_id: user.id,
        name: r.name,
        description: r.description || null,
        instructions: fullInstructions || r.instructions || null,
        calories: r.calories,
        protein: r.protein,
        carbs: r.carbs,
        fats: r.fats,
        prep_time_minutes: r.prep_time_minutes || null,
        cook_time_minutes: r.cook_time_minutes || null,
        servings: r.servings || 1,
        tags: r.tags || [],
        image_url: null,
      });

      if (!error) {
        savedCount++;
        setRecipes((prev) =>
          prev.map((res, idx) => (idx === i ? { ...res, saved: true } : res))
        );
      }
    }

    queryClient.invalidateQueries({ queryKey: ["recipes"] });
    toast.success(`${savedCount} recipes saved to your library!`);
    setIsSaving(false);
  };

  const handleReset = () => {
    setRecipes([]);
    setTextInput("");
    setPdfFileNames([]);
    setPdfText("");
    pdfTextRef.current = "";
    setError("");
  };

  const unsavedCount = recipes.filter((r) => !r.saved).length;
  const savedCount = recipes.filter((r) => r.saved).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            AI Bulk Recipe Import
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Upload PDFs or paste text — AI will automatically find and extract all recipes
          </p>
        </DialogHeader>

        {recipes.length === 0 ? (
          <div className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={inputMode === "text" ? "default" : "outline"}
                size="sm"
                onClick={() => setInputMode("text")}
              >
                <FileText className="h-4 w-4 mr-2" />
                Paste Text
              </Button>
              <Button
                variant={inputMode === "pdf" ? "default" : "outline"}
                size="sm"
                onClick={() => setInputMode("pdf")}
              >
                <FileUp className="h-4 w-4 mr-2" />
                Upload PDFs
              </Button>
            </div>

            {inputMode === "pdf" ? (
              <div className="space-y-2">
                <Label>Upload one or more PDFs with recipes</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handlePdfUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="w-full h-24 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center gap-1">
                    <FileUp className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {pdfFileNames.length > 0
                        ? `${pdfFileNames.length} file(s): ${pdfFileNames.join(", ")}`
                        : "Click to select one or more PDF files"}
                    </span>
                  </div>
                </Button>
                {pdfText && (
                  <p className="text-xs text-muted-foreground">
                    ✓ {pdfText.length.toLocaleString()} characters extracted — ready for AI
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Paste all your recipes below</Label>
                <Textarea
                  placeholder={`Just paste your recipes in any format — AI will find them all automatically.\n\nExample:\nOmad Iron Bowl\n770 Calories, 49g Protein, 12g Carbs, 59g Fat\n1 avocado, hass\n2 large eggs\n6 oz Beef ground 90% lean\nBrown ground beef thoroughly...\n\n4-Ingredient Chicken Parmesan\n363 Calories, 42g Protein, 8g Carbs, 18g Fat\n...`}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="min-h-[300px] text-sm font-mono"
                />
              </div>
            )}

            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                {inputMode === "pdf"
                  ? "Upload your recipe PDFs and AI will automatically detect and extract every recipe — no separators needed."
                  : "Paste your recipes in any format. AI will automatically detect where each recipe starts and ends."}
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleExtractAll}
              disabled={isProcessing || (inputMode === "pdf" ? !pdfText.trim() : !textInput.trim())}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  AI is extracting recipes...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Extract All Recipes with AI
                </>
              )}
            </Button>
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-1">
            <div className="space-y-3">
              {recipes.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="shrink-0">
                    {r.saved ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.calories} cal · P{r.protein}g · C{r.carbs}g · F{r.fats}g
                    </p>
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
          {recipes.length > 0 ? (
            <>
              <Button variant="outline" onClick={handleReset} disabled={isProcessing || isSaving}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Start Over
              </Button>
              {unsavedCount > 0 && (
                <Button onClick={handleSaveAll} disabled={isSaving || isProcessing}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save {unsavedCount} Recipes
                </Button>
              )}
              {savedCount > 0 && unsavedCount === 0 && (
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
