import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, BookOpen, Star } from "lucide-react";

interface RecipeBooksProps {
  recipeBookAssignments: any[];
}

export function RecipeBooks({ recipeBookAssignments }: RecipeBooksProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);

  // Flatten all recipes from all books
  const allRecipes = recipeBookAssignments.flatMap(assignment =>
    assignment.recipe_books?.recipe_book_recipes?.map((rbr: any) => ({
      ...rbr.recipes,
      bookName: assignment.recipe_books.name,
      bookId: assignment.recipe_books.id,
    })) || []
  );

  // Filter recipes based on search
  const filteredRecipes = allRecipes.filter((recipe: any) =>
    recipe.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Get featured book (first one marked as featured, or just first one)
  const featuredBook = recipeBookAssignments.find(a => a.recipe_books?.is_featured)?.recipe_books || 
                        recipeBookAssignments[0]?.recipe_books;

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search all recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Featured Recipe Book */}
      {featuredBook && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-primary text-primary" />
              <CardTitle>Featured</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div 
              className="relative rounded-lg overflow-hidden cursor-pointer group"
              onClick={() => setSelectedBook(featuredBook.id)}
            >
              {featuredBook.cover_image_url ? (
                <img 
                  src={featuredBook.cover_image_url}
                  alt={featuredBook.name}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <BookOpen className="h-16 w-16 text-primary/40" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                <h3 className="text-2xl font-bold text-white">{featuredBook.name}</h3>
                <p className="text-white/90 text-sm mt-1">{featuredBook.description}</p>
                <div className="mt-2 text-white/80 text-sm">
                  {featuredBook.recipe_book_recipes?.length || 0} recipes
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Recipe Books */}
      <div>
        <h3 className="text-lg font-semibold mb-4">All Recipe Books</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recipeBookAssignments.map((assignment) => {
            const book = assignment.recipe_books;
            const recipeCount = book.recipe_book_recipes?.length || 0;

            return (
              <Card 
                key={book.id} 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setSelectedBook(book.id)}
              >
                <CardContent className="p-4">
                  {book.cover_image_url ? (
                    <img 
                      src={book.cover_image_url}
                      alt={book.name}
                      className="w-full h-32 object-cover rounded-md mb-3"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-md mb-3 flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-primary/40" />
                    </div>
                  )}
                  <h4 className="font-semibold mb-1">{book.name}</h4>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {book.description}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    {recipeCount} recipe{recipeCount !== 1 ? "s" : ""}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recipe Search Results */}
      {searchQuery && (
        <div>
          <h3 className="text-lg font-semibold mb-4">
            Search Results ({filteredRecipes.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRecipes.map((recipe: any) => (
              <Card 
                key={recipe.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setSelectedRecipe(recipe)}
              >
                <CardContent className="p-4">
                  {recipe.image_url && (
                    <img 
                      src={recipe.image_url}
                      alt={recipe.name}
                      className="w-full h-32 object-cover rounded-md mb-3"
                    />
                  )}
                  <h4 className="font-semibold mb-2">{recipe.name}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {recipe.calories} cal · P{recipe.protein}g · C{recipe.carbs}g · F{recipe.fats}g
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {recipe.bookName}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recipe Detail Dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRecipe?.name}</DialogTitle>
          </DialogHeader>
          {selectedRecipe && (
            <div className="space-y-4">
              {selectedRecipe.image_url && (
                <img 
                  src={selectedRecipe.image_url}
                  alt={selectedRecipe.name}
                  className="w-full h-64 object-cover rounded-lg"
                />
              )}
              
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{selectedRecipe.calories}</div>
                  <div className="text-xs text-muted-foreground">Calories</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{selectedRecipe.protein}g</div>
                  <div className="text-xs text-muted-foreground">Protein</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{selectedRecipe.carbs}g</div>
                  <div className="text-xs text-muted-foreground">Carbs</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{selectedRecipe.fats}g</div>
                  <div className="text-xs text-muted-foreground">Fats</div>
                </div>
              </div>

              {selectedRecipe.description && (
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedRecipe.description}</p>
                </div>
              )}

              {selectedRecipe.instructions && (
                <div>
                  <h4 className="font-semibold mb-2">Instructions</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {selectedRecipe.instructions}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                {selectedRecipe.prep_time_minutes && (
                  <Badge variant="secondary">
                    Prep: {selectedRecipe.prep_time_minutes} min
                  </Badge>
                )}
                {selectedRecipe.cook_time_minutes && (
                  <Badge variant="secondary">
                    Cook: {selectedRecipe.cook_time_minutes} min
                  </Badge>
                )}
                {selectedRecipe.servings && (
                  <Badge variant="secondary">
                    {selectedRecipe.servings} servings
                  </Badge>
                )}
              </div>

              {selectedRecipe.tags && selectedRecipe.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedRecipe.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Recipe Book Detail Dialog */}
      <Dialog open={!!selectedBook} onOpenChange={() => setSelectedBook(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {recipeBookAssignments.find(a => a.recipe_books?.id === selectedBook)?.recipe_books?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedBook && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recipeBookAssignments
                  .find(a => a.recipe_books?.id === selectedBook)
                  ?.recipe_books?.recipe_book_recipes?.map((rbr: any) => (
                    <Card 
                      key={rbr.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => {
                        setSelectedBook(null);
                        setSelectedRecipe(rbr.recipes);
                      }}
                    >
                      <CardContent className="p-4">
                        {rbr.recipes?.image_url && (
                          <img 
                            src={rbr.recipes.image_url}
                            alt={rbr.recipes.name}
                            className="w-full h-32 object-cover rounded-md mb-3"
                          />
                        )}
                        <h4 className="font-semibold mb-2">{rbr.recipes?.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {rbr.recipes?.calories} cal · P{rbr.recipes?.protein}g · C{rbr.recipes?.carbs}g · F{rbr.recipes?.fats}g
                        </p>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
