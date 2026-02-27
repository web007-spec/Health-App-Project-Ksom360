import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageCompression";
import { Upload, X } from "lucide-react";

interface EditRecipeDialogProps {
  recipe: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditRecipeDialog({ recipe, open, onOpenChange }: EditRecipeDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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
    servings: "",
    tags: "",
  });

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
    setImagePreview(recipe?.image_url || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (recipe) {
      setFormData({
        name: recipe.name || "",
        description: recipe.description || "",
        instructions: recipe.instructions || "",
        calories: recipe.calories?.toString() || "",
        protein: recipe.protein?.toString() || "",
        carbs: recipe.carbs?.toString() || "",
        fats: recipe.fats?.toString() || "",
        prep_time_minutes: recipe.prep_time_minutes?.toString() || "",
        cook_time_minutes: recipe.cook_time_minutes?.toString() || "",
        servings: recipe.servings?.toString() || "",
        tags: recipe.tags?.join(", ") || "",
      });
      setImagePreview(recipe.image_url || null);
      setImageFile(null);
    }
  }, [recipe]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const tags = formData.tags
        .split(",")
        .map(t => t.trim())
        .filter(t => t.length > 0);

      let imageUrl = recipe.image_url;

      // Upload new image if selected
      if (imageFile) {
        // Delete old image if it exists
        if (recipe.image_url) {
          const oldPath = recipe.image_url.split("/recipe-images/")[1];
          if (oldPath) {
            await supabase.storage.from("recipe-images").remove([oldPath]);
          }
        }

        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${recipe.trainer_id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("recipe-images")
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("recipe-images")
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      const { error } = await supabase
        .from("recipes")
        .update({
          name: formData.name,
          description: formData.description || null,
          instructions: formData.instructions || null,
          calories: Number(formData.calories),
          protein: Number(formData.protein),
          carbs: Number(formData.carbs),
          fats: Number(formData.fats),
          prep_time_minutes: formData.prep_time_minutes ? Number(formData.prep_time_minutes) : null,
          cook_time_minutes: formData.cook_time_minutes ? Number(formData.cook_time_minutes) : null,
          servings: formData.servings ? Number(formData.servings) : null,
          tags: tags.length > 0 ? tags : null,
          image_url: imageUrl,
        })
        .eq("id", recipe.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Recipe updated!");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to update recipe");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Recipe</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Recipe Image</Label>
            <div className="mt-2">
              {imagePreview ? (
                <div className="relative inline-block">
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

          <div>
            <Label htmlFor="name">Recipe Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label htmlFor="calories">Calories</Label>
              <Input
                id="calories"
                type="number"
                value={formData.calories}
                onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="protein">Protein (g)</Label>
              <Input
                id="protein"
                type="number"
                step="0.1"
                value={formData.protein}
                onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="carbs">Carbs (g)</Label>
              <Input
                id="carbs"
                type="number"
                step="0.1"
                value={formData.carbs}
                onChange={(e) => setFormData({ ...formData, carbs: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="fats">Fats (g)</Label>
              <Input
                id="fats"
                type="number"
                step="0.1"
                value={formData.fats}
                onChange={(e) => setFormData({ ...formData, fats: e.target.value })}
              />
            </div>
          </div>

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

          <div>
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
