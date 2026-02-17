import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Clock, ChefHat, Users, Pencil, Trash2, Flame } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EditRecipeDialog } from "@/components/nutrition/EditRecipeDialog";
import { DeleteRecipeDialog } from "@/components/nutrition/DeleteRecipeDialog";

const DIETARY_OPTIONS = [
  "Dairy-Free", "Gluten-Free", "High Protein", "Keto Diet", "Low Calorie",
  "Low Carb", "Low Sodium", "Low Sugar", "Nut-Free", "Pescatarian",
  "Shellfish-Free", "Vegan", "Vegetarian",
];

const CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snack", "Soup", "Salad/Bowl", "Others"];

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [editingRecipe, setEditingRecipe] = useState<any>(null);
  const [deletingRecipe, setDeletingRecipe] = useState<any>(null);

  const { data: recipe, isLoading } = useQuery({
    queryKey: ["recipe-detail", id],
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

  if (isLoading || !recipe) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  const tags = (recipe.tags || []) as string[];
  const dishType = tags.find((t) => t === "Main dish" || t === "Side dish");
  const category = tags.find((t) => CATEGORIES.includes(t));
  const dietaryTags = tags.filter((t) => DIETARY_OPTIONS.includes(t));
  const otherTags = tags.filter(
    (t) => t !== dishType && !CATEGORIES.includes(t) && !DIETARY_OPTIONS.includes(t)
  );

  // Parse instructions - split by sections
  const instructionText = recipe.instructions || "";
  const ingredientsFromInstructions = instructionText.match(/## Ingredients\n([\s\S]*?)(?=## |$)/)?.[1]?.trim();
  const directionsFromInstructions = instructionText.match(/## Directions\n([\s\S]*?)$/)?.[1]?.trim();
  const plainInstructions = !instructionText.includes("## ") ? instructionText : null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Back & Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/recipes")}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditingRecipe(recipe)}>
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </Button>
            <Button variant="outline" onClick={() => setDeletingRecipe(recipe)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="flex flex-col md:flex-row gap-6">
          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.name}
              className="w-full md:w-80 h-64 object-cover rounded-lg"
            />
          ) : (
            <div className="w-full md:w-80 h-64 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center">
              <ChefHat className="h-16 w-16 text-primary/40" />
            </div>
          )}

          <div className="flex-1 space-y-3">
            <h1 className="text-3xl font-bold text-foreground">{recipe.name}</h1>

            {/* Dish type + category badges */}
            <div className="flex flex-wrap gap-2">
              {dishType && (
                <Badge variant="outline" className="text-sm">
                  <ChefHat className="h-3 w-3 mr-1" /> {dishType}
                </Badge>
              )}
              {category && (
                <Badge variant="outline" className="text-sm">{category}</Badge>
              )}
              {otherTags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-sm">{tag}</Badge>
              ))}
            </div>

            {/* Description */}
            {recipe.description && (
              <div>
                <span className="text-2xl text-primary/30 leading-none">"</span>
                <p className="text-sm text-muted-foreground italic inline">{recipe.description}</p>
              </div>
            )}

            {/* Prep / Cook / Servings */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> Prep: <strong className="text-foreground">{recipe.prep_time_minutes || 0}m</strong>
              </span>
              <span className="flex items-center gap-1">
                <ChefHat className="h-4 w-4" /> Cooking: <strong className="text-foreground">{recipe.cook_time_minutes || 0}m</strong>
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" /> Serving: <strong className="text-foreground">{recipe.servings || 1}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Dietary Information */}
        {dietaryTags.length > 0 && (
          <div className="flex flex-wrap gap-6 justify-center py-4">
            {dietaryTags.map((tag) => (
              <div key={tag} className="flex flex-col items-center gap-1.5">
                <div className="h-14 w-14 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center">
                  <span className="text-xl">{getDietaryIcon(tag)}</span>
                </div>
                <span className="text-xs text-muted-foreground">{tag}</span>
              </div>
            ))}
          </div>
        )}

        {/* Macros Card */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-1">
                  <span className="font-bold text-xl">{recipe.calories || 0}</span>
                  <span className="text-sm text-muted-foreground">cal</span>
                </div>
                <p className="text-xs text-muted-foreground">Calories</p>
              </div>
              <div>
                <div className="font-bold text-xl">{Number(recipe.protein || 0)} <span className="text-sm font-normal text-muted-foreground">g</span></div>
                <p className="text-xs text-muted-foreground">Protein</p>
              </div>
              <div>
                <div className="font-bold text-xl">{Number(recipe.carbs || 0)} <span className="text-sm font-normal text-muted-foreground">g</span></div>
                <p className="text-xs text-muted-foreground">Carbs</p>
              </div>
              <div>
                <div className="font-bold text-xl">{Number(recipe.fats || 0)} <span className="text-sm font-normal text-muted-foreground">g</span></div>
                <p className="text-xs text-muted-foreground">Fat</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Ingredients / Instructions / Nutrition Info */}
        <Card>
          <CardContent className="p-0">
            <Tabs defaultValue="ingredients" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
                <TabsTrigger value="ingredients" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
                  Ingredients
                </TabsTrigger>
                <TabsTrigger value="instructions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
                  Instructions
                </TabsTrigger>
                <TabsTrigger value="nutrition" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
                  Nutrition Info
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ingredients" className="p-6">
                {ingredients && ingredients.length > 0 ? (
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
                ) : ingredientsFromInstructions ? (
                  <div className="space-y-2">
                    {ingredientsFromInstructions.split("\n").filter(Boolean).map((line, i) => (
                      <p key={i} className="text-sm">{line.replace(/^[-•]\s*/, "")}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No ingredients added yet.</p>
                )}
              </TabsContent>

              <TabsContent value="instructions" className="p-6">
                {(directionsFromInstructions || plainInstructions) ? (
                  <div className="space-y-3">
                    {(directionsFromInstructions || plainInstructions || "").split("\n").filter(Boolean).map((line, i) => (
                      <p key={i} className="text-sm">
                        <span className="font-bold text-primary mr-2">{i + 1}.</span>
                        {line.replace(/^\d+\.\s*/, "")}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No instructions added yet.</p>
                )}
              </TabsContent>

              <TabsContent value="nutrition" className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm">Calories</span>
                    <span className="text-sm font-medium">{recipe.calories || 0} cal</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm">Protein</span>
                    <span className="text-sm font-medium">{Number(recipe.protein || 0)}g</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm">Carbs</span>
                    <span className="text-sm font-medium">{Number(recipe.carbs || 0)}g</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm">Fat</span>
                    <span className="text-sm font-medium">{Number(recipe.fats || 0)}g</span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

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
          onOpenChange={(open) => {
            if (!open) {
              setDeletingRecipe(null);
              navigate("/recipes");
            }
          }}
        />
      )}
    </DashboardLayout>
  );
}

function getDietaryIcon(tag: string): string {
  const icons: Record<string, string> = {
    "Dairy-Free": "🥛",
    "Gluten-Free": "🌾",
    "High Protein": "💪",
    "Keto Diet": "🥑",
    "Low Calorie": "🔥",
    "Low Carb": "🍞",
    "Low Sodium": "🧂",
    "Low Sugar": "🍬",
    "Nut-Free": "🥜",
    "Pescatarian": "🐟",
    "Shellfish-Free": "🦐",
    "Vegan": "🌱",
    "Vegetarian": "🥬",
  };
  return icons[tag] || "🏷️";
}
