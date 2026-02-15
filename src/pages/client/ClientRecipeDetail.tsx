import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, Clock, ChefHat, Users, Bookmark, BookmarkCheck, Plus, Flame, Check, MoreHorizontal } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ClientRecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [showBookmarkSheet, setShowBookmarkSheet] = useState(false);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [servings, setServings] = useState(1);
  const [descExpanded, setDescExpanded] = useState(false);
  const [logCount, setLogCount] = useState(0);

  const { data: recipe, isLoading } = useQuery({
    queryKey: ["client-recipe", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("recipes").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: ingredients } = useQuery({
    queryKey: ["recipe-ingredients", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe_ingredients")
        .select("*")
        .eq("recipe_id", id!)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: savedRecipe } = useQuery({
    queryKey: ["saved-recipe", user?.id, id],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_saved_recipes")
        .select("*")
        .eq("client_id", user!.id)
        .eq("recipe_id", id!)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id && !!id,
  });

  const { data: collections } = useQuery({
    queryKey: ["recipe-collections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_recipe_collections")
        .select("*")
        .eq("client_id", user!.id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isSaved = !!savedRecipe;

  const toggleBookmark = useMutation({
    mutationFn: async () => {
      if (isSaved) {
        await supabase.from("client_saved_recipes").delete().eq("id", savedRecipe!.id);
      } else {
        setShowBookmarkSheet(true);
        return;
      }
    },
    onSuccess: () => {
      if (isSaved) {
        queryClient.invalidateQueries({ queryKey: ["saved-recipe"] });
        toast.success("Removed from saved");
      }
    },
  });

  const saveToCollection = useMutation({
    mutationFn: async (collectionId: string | null) => {
      await supabase.from("client_saved_recipes").insert({
        client_id: user!.id,
        recipe_id: id!,
        collection_id: collectionId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-recipe"] });
      setShowBookmarkSheet(false);
      toast.success("Recipe saved!");
    },
  });

  const createCollection = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("client_recipe_collections")
        .insert({ client_id: user!.id, name: newCollectionName.trim() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["recipe-collections"] });
      setNewCollectionName("");
      setShowNewCollection(false);
      saveToCollection.mutate(data.id);
    },
  });

  const logMeal = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("nutrition_logs").insert({
        client_id: user!.id,
        meal_name: recipe!.name,
        calories: recipe!.calories ? Math.round(recipe!.calories * servings / (recipe!.servings || 1)) : null,
        protein: recipe!.protein ? Math.round(Number(recipe!.protein) * servings / (recipe!.servings || 1)) : null,
        carbs: recipe!.carbs ? Math.round(Number(recipe!.carbs) * servings / (recipe!.servings || 1)) : null,
        fats: recipe!.fats ? Math.round(Number(recipe!.fats) * servings / (recipe!.servings || 1)) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setLogCount((c) => c + 1);
      setShowLogDrawer(false);
      queryClient.invalidateQueries({ queryKey: ["nutrition-logs"] });
      toast.success("Successfully logged meal to Macros");
    },
  });

  const scaledCalories = recipe?.calories ? Math.round(recipe.calories * servings / (recipe.servings || 1)) : 0;
  const scaledProtein = recipe?.protein ? Math.round(Number(recipe.protein) * servings / (recipe.servings || 1)) : 0;
  const scaledCarbs = recipe?.carbs ? Math.round(Number(recipe.carbs) * servings / (recipe.servings || 1)) : 0;
  const scaledFats = recipe?.fats ? Math.round(Number(recipe.fats) * servings / (recipe.servings || 1)) : 0;

  if (isLoading || !recipe) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </ClientLayout>
    );
  }

  // Parse instructions into prep/cooking steps
  const instructionLines = recipe.instructions?.split("\n").filter((l: string) => l.trim()) || [];

  return (
    <ClientLayout>
      <div className="pb-24">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setServings(recipe.servings || 1); setShowLogDrawer(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Log meal
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => isSaved ? toggleBookmark.mutate() : setShowBookmarkSheet(true)}
            >
              {isSaved ? (
                <BookmarkCheck className="h-5 w-5 text-amber-500 fill-amber-500" />
              ) : (
                <Bookmark className="h-5 w-5" />
              )}
            </Button>
            {logCount > 0 && (
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Title & Tags */}
        <div className="px-4 pb-3">
          <h1 className="text-2xl font-bold text-foreground">{recipe.name}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            {recipe.tags?.map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-xs border-primary/30 text-primary">
                {tag}
              </Badge>
            ))}
            {logCount > 0 && (
              <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                <Check className="h-3 w-3 mr-1" /> Logged ({logCount})
              </Badge>
            )}
          </div>
        </div>

        {/* Hero Image */}
        {recipe.image_url ? (
          <img src={recipe.image_url} alt={recipe.name} className="w-full h-64 object-cover" />
        ) : (
          <div className="w-full h-64 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <ChefHat className="h-16 w-16 text-primary/40" />
          </div>
        )}

        {/* Description Card */}
        <div className="px-4 -mt-6 relative z-10">
          <Card>
            <CardContent className="p-4">
              {recipe.description && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground italic">
                    <span className="text-2xl text-primary/30 leading-none">"</span>
                    {descExpanded ? recipe.description : recipe.description.slice(0, 150)}
                    {!descExpanded && recipe.description.length > 150 && "..."}
                  </p>
                  {recipe.description.length > 150 && (
                    <button className="text-xs text-primary font-medium mt-1" onClick={() => setDescExpanded(!descExpanded)}>
                      {descExpanded ? "Show less" : "Read more"}
                    </button>
                  )}
                </div>
              )}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <Clock className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">Prep</p>
                  <p className="font-bold text-sm">{recipe.prep_time_minutes || 0}m</p>
                </div>
                <div>
                  <ChefHat className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">Cooking</p>
                  <p className="font-bold text-sm">{recipe.cook_time_minutes || 0}m</p>
                </div>
                <div>
                  <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">Portion Size</p>
                  <p className="font-bold text-sm">{recipe.servings || 1} servings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dietary / Tags Section */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="px-4 mt-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-bold text-base mb-3">Dietary Information</h3>
                <div className="flex flex-wrap gap-4">
                  {recipe.tags.map((tag: string) => (
                    <div key={tag} className="flex flex-col items-center gap-1">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-lg">🥗</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{tag}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Nutrition Summary */}
        <div className="px-4 mt-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold text-base mb-3">Nutrition per serving</h3>
              <div className="grid grid-cols-4 gap-3 text-center">
                <div>
                  <div className="flex items-center justify-center gap-1">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="font-bold text-lg">{recipe.calories || 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Calories</p>
                </div>
                <div>
                  <span className="font-bold text-lg">{Number(recipe.protein || 0)}g</span>
                  <p className="text-xs text-muted-foreground">Protein</p>
                </div>
                <div>
                  <span className="font-bold text-lg">{Number(recipe.carbs || 0)}g</span>
                  <p className="text-xs text-muted-foreground">Carbs</p>
                </div>
                <div>
                  <span className="font-bold text-lg">{Number(recipe.fats || 0)}g</span>
                  <p className="text-xs text-muted-foreground">Fat</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ingredients */}
        {ingredients && ingredients.length > 0 && (
          <div className="px-4 mt-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-bold text-base mb-3">Ingredients</h3>
                <div className="divide-y divide-border">
                  {ingredients.map((ing: any) => (
                    <div key={ing.id} className="flex items-center justify-between py-3">
                      <span className="text-sm font-medium">{ing.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {ing.amount} {ing.unit}
                      </span>
                    </div>
                  ))}
                </div>
                {ingredients.some((i: any) => i.notes) && (
                  <div className="mt-3 bg-muted rounded-lg p-3">
                    <p className="text-xs font-semibold mb-1">📝 Additional note</p>
                    {ingredients.filter((i: any) => i.notes).map((i: any) => (
                      <p key={i.id} className="text-xs text-muted-foreground">{i.notes}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Instructions */}
        {instructionLines.length > 0 && (
          <div className="px-4 mt-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-bold text-base mb-3">Instructions</h3>
                <div className="space-y-3">
                  {instructionLines.map((line: string, idx: number) => (
                    <p key={idx} className="text-sm text-foreground">
                      <span className="font-bold text-primary mr-1">{idx + 1}.</span> {line.replace(/^\d+\.\s*/, "")}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Log Meal Drawer */}
      <Drawer open={showLogDrawer} onOpenChange={setShowLogDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <p className="text-xs text-muted-foreground">Today</p>
            <DrawerTitle>{recipe.name}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label className="text-sm">Number of Serving</Label>
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={servings}
                  onChange={(e) => setServings(Number(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Measurement</Label>
                <div className="mt-1 px-4 py-2 border rounded-md text-sm bg-muted">serving</div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 bg-muted rounded-lg p-3 text-center">
              <div>
                <div className="flex items-center justify-center gap-1">
                  <Flame className="h-3 w-3 text-orange-500" />
                  <span className="font-bold">{scaledCalories}</span>
                </div>
                <p className="text-xs text-muted-foreground">Calories</p>
              </div>
              <div>
                <span className="font-bold">{scaledProtein}g</span>
                <p className="text-xs text-muted-foreground">Protein</p>
              </div>
              <div>
                <span className="font-bold">{scaledCarbs}g</span>
                <p className="text-xs text-muted-foreground">Carbs</p>
              </div>
              <div>
                <span className="font-bold">{scaledFats}g</span>
                <p className="text-xs text-muted-foreground">Fat</p>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={() => logMeal.mutate()}
              disabled={logMeal.isPending}
            >
              {logMeal.isPending ? "Logging..." : "Log"}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Bookmark Sheet */}
      <Drawer open={showBookmarkSheet} onOpenChange={setShowBookmarkSheet}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Save Recipe</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-3">
            {/* Default Saved */}
            <div
              className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent"
              onClick={() => saveToCollection.mutate(null)}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Bookmark className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className="font-medium">Saved</span>
              </div>
              <BookmarkCheck className="h-5 w-5 text-amber-500" />
            </div>

            {/* Collections header */}
            <div className="flex items-center justify-between pt-2">
              <h4 className="font-bold">Collections</h4>
              <button className="text-sm text-primary font-medium" onClick={() => setShowNewCollection(true)}>
                New collection
              </button>
            </div>

            {/* Existing collections */}
            {collections?.map((col: any) => (
              <div
                key={col.id}
                className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent"
                onClick={() => saveToCollection.mutate(col.id)}
              >
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Bookmark className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className="font-medium">{col.name}</span>
              </div>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      {/* New Collection Dialog */}
      <Dialog open={showNewCollection} onOpenChange={setShowNewCollection}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Collection</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Collection name"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCollection(false)}>Cancel</Button>
            <Button onClick={() => createCollection.mutate()} disabled={!newCollectionName.trim()}>
              Create & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClientLayout>
  );
}
