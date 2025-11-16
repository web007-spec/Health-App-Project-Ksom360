import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, BookOpen, Star } from "lucide-react";
import { CreateRecipeBookDialog } from "@/components/nutrition/CreateRecipeBookDialog";
import { useNavigate } from "react-router-dom";

export default function RecipeBooks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: recipeBooks, isLoading } = useQuery({
    queryKey: ["recipe-books", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe_books")
        .select(`
          *,
          recipe_book_recipes (
            recipes (*)
          )
        `)
        .eq("trainer_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Recipe Books</h1>
            <p className="text-muted-foreground mt-2">
              Organize recipes into collections for clients
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Recipe Book
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading recipe books...</div>
        ) : recipeBooks && recipeBooks.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recipeBooks.map((book) => {
              const recipeCount = book.recipe_book_recipes?.length || 0;

              return (
                <Card
                  key={book.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => navigate(`/recipe-books/${book.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="relative">
                      {book.cover_image_url ? (
                        <img
                          src={book.cover_image_url}
                          alt={book.name}
                          className="w-full h-40 object-cover rounded-md mb-3"
                        />
                      ) : (
                        <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-primary/5 rounded-md mb-3 flex items-center justify-center">
                          <BookOpen className="h-16 w-16 text-primary/40" />
                        </div>
                      )}
                      {book.is_featured && (
                        <div className="absolute top-2 right-2">
                          <div className="bg-primary/90 text-primary-foreground rounded-full p-2">
                            <Star className="h-4 w-4 fill-current" />
                          </div>
                        </div>
                      )}
                    </div>

                    <h3 className="font-semibold text-lg mb-2">{book.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {book.description}
                    </p>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {recipeCount} recipe{recipeCount !== 1 ? "s" : ""}
                      </span>
                      <Button size="sm" variant="ghost">
                        View →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No recipe books yet</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Recipe Book
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <CreateRecipeBookDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </DashboardLayout>
  );
}
