import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { z } from "zod";
import { compressImage } from "@/lib/imageCompression";
import { Upload, X } from "lucide-react";
import { IngredientSearch, type RecipeIngredient } from "@/components/nutrition/IngredientSearch";

const recipeSchema = z.object({
  name: z.string().trim().min(1, "Recipe name is required").max(200),
  description: z.string().trim().max(1000).optional(),
  instructions: z.string().trim().max(5000).optional(),
  calories: z.number().min(0).max(10000),
  protein: z.number().min(0).max(1000),
  carbs: z.number().min(0).max(1000),
  fats: z.number().min(0).max(1000),
  prep_time_minutes: z.number().min(0).max(1440).optional(),
  cook_time_minutes: z.number().min(0).max(1440).optional(),
  servings: z.number().min(1).max(100).optional(),
  tags: z.string().optional(),
});

interface CreateRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRecipeDialog({ open, onOpenChange }: CreateRecipeDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [macroMode, setMacroMode] = useState<"ingredients" | "manual">("ingredients");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    instructions: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    prep_time_minutes: "",
    cook_time_minutes: "",
    servings: "1",
    tags: "",
  });

  // Auto-calculate macros from ingredients
  const ingredientTotals = ingredients.reduce(
    (acc, ing) => ({
      calories: acc.calories + ing.calories,
      protein: acc.protein + ing.protein,
      carbs: acc.carbs + ing.carbs,
      fats: acc.fats + ing.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  // Sync ingredient totals to form when in ingredients mode
  useEffect(() => {
    if (macroMode === "ingredients" && ingredients.length > 0) {
      setFormData((prev) => ({
        ...prev,
        calories: String(Math.round(ingredientTotals.calories)),
        protein: String(Math.round(ingredientTotals.protein * 10) / 10),
        carbs: String(Math.round(ingredientTotals.carbs * 10) / 10),
        fats: String(Math.round(ingredientTotals.fats * 10) / 10),
      }));
    }
  }, [ingredients, macroMode]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    try {
      const compressed = await compressImage(file);
      const compressedFile = new File([compressed], file.name, { type: "image/jpeg" });
      setImageFile(compressedFile);
      setImagePreview(URL.createObjectURL(compressed));
    } catch (error) {
      toast.error("Failed to process image");
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const parsed = recipeSchema.parse({
        ...formData,
        calories: Number(formData.calories),
        protein: Number(formData.protein),
        carbs: Number(formData.carbs),
        fats: Number(formData.fats),
        prep_time_minutes: formData.prep_time_minutes ? Number(formData.prep_time_minutes) : undefined,
        cook_time_minutes: formData.cook_time_minutes ? Number(formData.cook_time_minutes) : undefined,
        servings: formData.servings ? Number(formData.servings) : undefined,
      });

      const tags = formData.tags
        .split(",")
        .map(t => t.trim())
        .filter(t => t.length > 0);

      let imageUrl = null;

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("recipe-images")
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("recipe-images")
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      // Build instructions including ingredient list if using USDA mode
      let fullInstructions = parsed.instructions || "";
      if (macroMode === "ingredients" && ingredients.length > 0) {
        const ingredientList = ingredients
          .map((ing) => `${ing.quantity}${ing.unit} ${ing.name}${ing.brandOwner ? ` (${ing.brandOwner})` : ""}`)
          .join("\n");
        fullInstructions = `Ingredients:\n${ingredientList}\n\n${fullInstructions}`.trim();
      }

      const { error } = await supabase.from("recipes").insert([{
        trainer_id: user?.id!,
        name: parsed.name,
        description: parsed.description || null,
        instructions: fullInstructions || null,
        calories: parsed.calories,
        protein: parsed.protein,
        carbs: parsed.carbs,
        fats: parsed.fats,
        prep_time_minutes: parsed.prep_time_minutes || null,
        cook_time_minutes: parsed.cook_time_minutes || null,
        servings: parsed.servings || 1,
        tags: tags.length > 0 ? tags : null,
        image_url: imageUrl,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Recipe created!");
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create recipe");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      instructions: "",
      calories: "",
      protein: "",
      carbs: "",
      fats: "",
      prep_time_minutes: "",
      cook_time_minutes: "",
      servings: "1",
      tags: "",
    });
    setIngredients([]);
    handleRemoveImage();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Recipe</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image */}
          <div>
            <Label>Recipe Image</Label>
            <div className="mt-2">
              {imagePreview ? (
                <div className="relative inline-block w-full">
                  <img
                    src={imagePreview}
                    alt="Recipe preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <Label htmlFor="name">Recipe Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Grilled Chicken Salad"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the recipe"
              rows={2}
            />
          </div>

          {/* Nutrition Mode Tabs */}
          <div>
            <Label className="mb-2 block">Nutrition Data</Label>
            <Tabs value={macroMode} onValueChange={(v) => setMacroMode(v as "ingredients" | "manual")}>
              <TabsList className="w-full">
                <TabsTrigger value="ingredients" className="flex-1">
                  🔍 Search Ingredients (USDA)
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex-1">
                  ✏️ Manual Entry
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ingredients" className="mt-3">
                <IngredientSearch
                  ingredients={ingredients}
                  onIngredientsChange={setIngredients}
                />
                {ingredients.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Search the USDA FoodData Central database to add ingredients. Macros will be calculated automatically.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="manual" className="mt-3">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="calories">Calories *</Label>
                    <Input
                      id="calories"
                      type="number"
                      value={formData.calories}
                      onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="protein">Protein (g) *</Label>
                    <Input
                      id="protein"
                      type="number"
                      step="0.1"
                      value={formData.protein}
                      onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="carbs">Carbs (g) *</Label>
                    <Input
                      id="carbs"
                      type="number"
                      step="0.1"
                      value={formData.carbs}
                      onChange={(e) => setFormData({ ...formData, carbs: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fats">Fats (g) *</Label>
                    <Input
                      id="fats"
                      type="number"
                      step="0.1"
                      value={formData.fats}
                      onChange={(e) => setFormData({ ...formData, fats: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Calculated macros display when using ingredients */}
          {macroMode === "ingredients" && ingredients.length > 0 && (
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label className="text-muted-foreground">Calories</Label>
                <Input value={formData.calories} readOnly className="bg-muted" />
              </div>
              <div>
                <Label className="text-muted-foreground">Protein (g)</Label>
                <Input value={formData.protein} readOnly className="bg-muted" />
              </div>
              <div>
                <Label className="text-muted-foreground">Carbs (g)</Label>
                <Input value={formData.carbs} readOnly className="bg-muted" />
              </div>
              <div>
                <Label className="text-muted-foreground">Fats (g)</Label>
                <Input value={formData.fats} readOnly className="bg-muted" />
              </div>
            </div>
          )}

          {/* Times & Servings */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="prep_time">Prep Time (min)</Label>
              <Input
                id="prep_time"
                type="number"
                value={formData.prep_time_minutes}
                onChange={(e) => setFormData({ ...formData, prep_time_minutes: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cook_time">Cook Time (min)</Label>
              <Input
                id="cook_time"
                type="number"
                value={formData.cook_time_minutes}
                onChange={(e) => setFormData({ ...formData, cook_time_minutes: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="servings">Servings</Label>
              <Input
                id="servings"
                type="number"
                value={formData.servings}
                onChange={(e) => setFormData({ ...formData, servings: e.target.value })}
              />
            </div>
          </div>

          {/* Instructions */}
          <div>
            <Label htmlFor="instructions">Directions</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="Step-by-step cooking instructions"
              rows={4}
            />
          </div>

          {/* Tags */}
          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g., High Protein, Low Carb, Vegetarian"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create Recipe"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
