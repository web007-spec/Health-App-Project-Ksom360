import { useState, useRef } from "react";
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
import { Sparkles, Link, FileText, Loader2, Save, RotateCcw, FileUp, ImagePlus, X } from "lucide-react";

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
  dish_type?: string;
  category?: string[];
  dietary_info?: string[];
}

const CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snack", "Soup", "Salad/Bowl", "Others"];

const DIETARY_OPTIONS = [
  "Dairy-Free", "Gluten-Free", "High Protein", "Keto Diet", "Low Calorie",
  "Low Carb", "Low Sodium", "Low Sugar", "Nut-Free", "Pescatarian",
  "Shellfish-Free", "Vegan", "Vegetarian",
];

export function AIRecipeBuilderDialog({ open, onOpenChange }: AIRecipeBuilderDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inputMode, setInputMode] = useState<"url" | "text" | "pdf">("url");
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [pdfFileName, setPdfFileName] = useState("");
  const [pdfText, setPdfText] = useState("");
  const [extractedRecipe, setExtractedRecipe] = useState<ExtractedRecipe | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [recipeImage, setRecipeImage] = useState<File | null>(null);
  const [recipeImagePreview, setRecipeImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }
    setPdfFileName(file.name);
    // Extract text from PDF using pdf.js via CDN
    try {
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
      setPdfText(text.trim());
      toast.success(`Extracted text from ${pdf.numPages} pages`);
    } catch {
      toast.error("Failed to read PDF. Try pasting the text instead.");
      setPdfFileName("");
    }
  };

  const handleGenerate = async () => {
    const payload: { url?: string; text?: string } = {};
    if (inputMode === "url") {
      if (!urlInput.trim()) {
        toast.error("Please enter a URL");
        return;
      }
      payload.url = urlInput.trim();
    } else if (inputMode === "pdf") {
      if (!pdfText.trim()) {
        toast.error("Please upload a PDF first");
        return;
      }
      payload.text = pdfText.trim();
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

      setExtractedRecipe({ ...data.recipe, dish_type: "Main dish", category: [], dietary_info: [] });
      toast.success("Recipe extracted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to extract recipe");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setRecipeImage(file);
    setRecipeImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!recipeImage || !user?.id) return null;
    setIsUploadingImage(true);
    try {
      const ext = recipeImage.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("recipe-images")
        .upload(path, recipeImage);
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from("recipe-images")
        .getPublicUrl(path);
      return urlData.publicUrl;
    } catch (err: any) {
      console.error("Image upload error:", err);
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!extractedRecipe || !user?.id) throw new Error("Missing data");

      const imageUrl = await uploadImage();

      // Merge all tags: original + dish_type + category + dietary_info
      const allTags = [
        ...(extractedRecipe.tags || []),
        ...(extractedRecipe.dish_type ? [extractedRecipe.dish_type] : []),
        ...(extractedRecipe.category || []),
        ...(extractedRecipe.dietary_info || []),
      ];

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
        tags: allTags,
        image_url: imageUrl,
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
    setPdfFileName("");
    setPdfText("");
    setRecipeImage(null);
    setRecipeImagePreview(null);
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
            Paste a URL, recipe text, or upload a PDF and AI will extract it into your library
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
              <Button
                variant={inputMode === "pdf" ? "default" : "outline"}
                size="sm"
                onClick={() => setInputMode("pdf")}
              >
                <FileUp className="h-4 w-4 mr-2" />
                PDF
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
            ) : inputMode === "pdf" ? (
              <div className="space-y-2">
                <Label>Upload PDF</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
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
                      {pdfFileName || "Click to select a PDF file"}
                    </span>
                  </div>
                </Button>
                {pdfText && (
                  <p className="text-xs text-muted-foreground">
                    ✓ {pdfText.length.toLocaleString()} characters extracted
                  </p>
                )}
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
              {/* Recipe Image Upload */}
              <div>
                <Label>Recipe Photo</Label>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {recipeImagePreview ? (
                  <div className="relative mt-1">
                    <img
                      src={recipeImagePreview}
                      alt="Recipe"
                      className="w-full h-40 object-cover rounded-md"
                    />
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7"
                      onClick={() => {
                        setRecipeImage(null);
                        setRecipeImagePreview(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full mt-1 h-20 border-dashed"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <ImagePlus className="h-5 w-5 mr-2 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Add a photo</span>
                  </Button>
                )}
              </div>

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

              {/* Dish Type */}
              <div>
                <Label>Dish Type</Label>
                <div className="flex gap-2 mt-1">
                  {["Main dish", "Side dish"].map((type) => (
                    <Button
                      key={type}
                      variant={extractedRecipe.dish_type === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateField("dish_type", type)}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <Label>Category</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {CATEGORIES.map((cat) => {
                    const selected = (extractedRecipe.category || []).includes(cat);
                    return (
                      <Button
                        key={cat}
                        variant={selected ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const current = extractedRecipe.category || [];
                          updateField("category", selected ? current.filter((c: string) => c !== cat) : [...current, cat]);
                        }}
                      >
                        {cat}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Dietary Information */}
              <div>
                <Label>Dietary Information</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {DIETARY_OPTIONS.map((diet) => {
                    const selected = extractedRecipe.dietary_info?.includes(diet);
                    return (
                      <Button
                        key={diet}
                        variant={selected ? "default" : "outline"}
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          const current = extractedRecipe.dietary_info || [];
                          updateField(
                            "dietary_info",
                            selected ? current.filter((d: string) => d !== diet) : [...current, diet]
                          );
                        }}
                      >
                        {diet}
                      </Button>
                    );
                  })}
                  {/* Custom dietary tags */}
                  {(extractedRecipe.dietary_info || [])
                    .filter((d: string) => !DIETARY_OPTIONS.includes(d))
                    .map((custom: string) => (
                      <Button
                        key={custom}
                        variant="default"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          updateField(
                            "dietary_info",
                            (extractedRecipe.dietary_info || []).filter((d: string) => d !== custom)
                          );
                        }}
                      >
                        {custom} ×
                      </Button>
                    ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Add custom dietary info..."
                    className="h-8 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val && !(extractedRecipe.dietary_info || []).includes(val)) {
                          updateField("dietary_info", [...(extractedRecipe.dietary_info || []), val]);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }
                    }}
                  />
                </div>
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
