import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, Loader2, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface USDAFood {
  fdcId: number;
  name: string;
  brandOwner: string | null;
  servingSize: number;
  servingSizeUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  sugar: number;
  dataType: string;
}

export interface RecipeIngredient {
  fdcId: number;
  name: string;
  brandOwner: string | null;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  // per-100g base values for recalculation
  baseCal: number;
  basePro: number;
  baseCarb: number;
  baseFat: number;
}

interface IngredientSearchProps {
  ingredients: RecipeIngredient[];
  onIngredientsChange: (ingredients: RecipeIngredient[]) => void;
}

export function IngredientSearch({ ingredients, onIngredientsChange }: IngredientSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<USDAFood[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const searchFoods = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-usda-foods", {
        body: { query: searchQuery, pageSize: 10 },
      });

      if (error) throw error;
      setResults(data?.foods || []);
      setShowResults(true);
    } catch (error) {
      console.error("USDA search error:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchFoods(query);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchFoods]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addIngredient = (food: USDAFood) => {
    // Default to servingSize from USDA or 100g
    const qty = food.servingSize || 100;
    const factor = qty / 100;

    const ingredient: RecipeIngredient = {
      fdcId: food.fdcId,
      name: food.name,
      brandOwner: food.brandOwner,
      quantity: qty,
      unit: food.servingSizeUnit || "g",
      calories: Math.round(food.calories * factor),
      protein: Math.round(food.protein * factor * 10) / 10,
      carbs: Math.round(food.carbs * factor * 10) / 10,
      fats: Math.round(food.fats * factor * 10) / 10,
      baseCal: food.calories,
      basePro: food.protein,
      baseCarb: food.carbs,
      baseFat: food.fats,
    };

    onIngredientsChange([...ingredients, ingredient]);
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  const removeIngredient = (index: number) => {
    onIngredientsChange(ingredients.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty < 0) return;
    const updated = [...ingredients];
    const ing = { ...updated[index] };
    ing.quantity = newQty;
    const factor = newQty / 100;
    ing.calories = Math.round(ing.baseCal * factor);
    ing.protein = Math.round(ing.basePro * factor * 10) / 10;
    ing.carbs = Math.round(ing.baseCarb * factor * 10) / 10;
    ing.fats = Math.round(ing.baseFat * factor * 10) / 10;
    updated[index] = ing;
    onIngredientsChange(updated);
  };

  const totals = ingredients.reduce(
    (acc, ing) => ({
      calories: acc.calories + ing.calories,
      protein: acc.protein + ing.protein,
      carbs: acc.carbs + ing.carbs,
      fats: acc.fats + ing.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  return (
    <div className="space-y-3">
      {/* Search */}
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search USDA database (e.g., chicken breast, rice)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            className="pl-10 pr-10"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {query && !isSearching && (
            <button
              onClick={() => { setQuery(""); setResults([]); setShowResults(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {showResults && results.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {results.map((food) => (
              <button
                key={food.fdcId}
                className="w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b last:border-b-0"
                onClick={() => addIngredient(food)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{food.name}</p>
                    {food.brandOwner && (
                      <p className="text-xs text-muted-foreground">by {food.brandOwner}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      per {food.servingSize || 100}{food.servingSizeUnit || "g"}
                    </p>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <p className="text-sm font-semibold">{Math.round(food.calories)} Cal</p>
                    <p className="text-xs text-muted-foreground">
                      P{food.protein}g · C{food.carbs}g · F{food.fats}g
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Ingredients list */}
      {ingredients.length > 0 && (
        <div className="space-y-2">
          {ingredients.map((ing, idx) => (
            <div
              key={`${ing.fdcId}-${idx}`}
              className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ing.name}</p>
                {ing.brandOwner && (
                  <p className="text-xs text-muted-foreground">by {ing.brandOwner}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => updateQuantity(idx, Math.max(0, ing.quantity - 10))}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  value={ing.quantity}
                  onChange={(e) => updateQuantity(idx, Number(e.target.value))}
                  className="w-16 h-7 text-center text-sm px-1"
                />
                <span className="text-xs text-muted-foreground w-4">{ing.unit}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => updateQuantity(idx, ing.quantity + 10)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-right shrink-0 w-20">
                <p className="text-xs font-medium">{ing.calories} Cal</p>
                <p className="text-[10px] text-muted-foreground">
                  P{ing.protein} C{ing.carbs} F{ing.fats}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => removeIngredient(idx)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}

          {/* Totals */}
          <div className="flex items-center justify-between p-3 border-2 border-primary/20 rounded-lg bg-primary/5">
            <span className="text-sm font-semibold">Total Nutrition</span>
            <div className="flex gap-3 text-sm">
              <Badge variant="secondary">{Math.round(totals.calories)} Cal</Badge>
              <span className="text-muted-foreground">
                P{Math.round(totals.protein * 10) / 10}g · C{Math.round(totals.carbs * 10) / 10}g · F{Math.round(totals.fats * 10) / 10}g
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
