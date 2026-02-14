import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ArrowLeft, ScanBarcode, Search, Plus, Check, Loader2, Camera } from "lucide-react";
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { BarcodeScannerDialog } from "@/components/BarcodeScannerDialog";
import { FoodPhotoAnalyzerDialog } from "@/components/FoodPhotoAnalyzerDialog";

interface FoodItem {
  fdcId: number;
  name: string;
  brandOwner: string | null;
  servingSize: number;
  servingSizeUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  portions: { amount: number; unit: string; gramWeight: number }[];
}

export default function ClientLogMeal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [servingCount, setServingCount] = useState("1");
  const [selectedPortion, setSelectedPortion] = useState<string>("");
  const [loggedIds, setLoggedIds] = useState<Set<number>>(new Set());
  const [scannerOpen, setScannerOpen] = useState(false);
  const [photoAnalyzerOpen, setPhotoAnalyzerOpen] = useState(false);

  // Manual add state
  const [manualName, setManualName] = useState("");
  const [manualCalories, setManualCalories] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFats, setManualFats] = useState("");

  const searchFoods = useCallback(async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-usda-foods", {
        body: { query: query.trim(), pageSize: 20 },
      });
      if (error) throw error;
      setSearchResults(data?.foods || []);
    } catch (err) {
      console.error("Search error:", err);
      toast.error("Failed to search foods");
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => searchFoods(value), 400);
    setSearchTimeout(timeout);
  };

  // Calculate macros based on selected portion
  const getScaledMacros = () => {
    if (!selectedFood) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    const count = parseFloat(servingCount) || 1;
    const portion = selectedFood.portions.find(p => p.unit === selectedPortion);
    const gramWeight = portion?.gramWeight || selectedFood.servingSize || 100;
    const scale = (gramWeight / 100) * count;
    return {
      calories: Math.round(selectedFood.calories * scale),
      protein: Math.round(selectedFood.protein * scale * 10) / 10,
      carbs: Math.round(selectedFood.carbs * scale * 10) / 10,
      fats: Math.round(selectedFood.fats * scale * 10) / 10,
    };
  };

  const getDefaultPortion = (food: FoodItem) => {
    if (food.portions.length > 0) return food.portions[0].unit;
    return "100g";
  };

  const getDefaultCalories = (food: FoodItem) => {
    if (food.portions.length > 0) {
      const p = food.portions[0];
      const scale = p.gramWeight / 100;
      return Math.round(food.calories * scale);
    }
    return food.calories;
  };

  const getDefaultPortionLabel = (food: FoodItem) => {
    if (food.portions.length > 0) return food.portions[0].unit;
    return `${food.servingSize}${food.servingSizeUnit}`;
  };

  // Log meal mutation
  const logMutation = useMutation({
    mutationFn: async (mealData: { name: string; calories: number; protein: number; carbs: number; fats: number }) => {
      const { error } = await supabase.from("nutrition_logs").insert({
        client_id: user?.id,
        log_date: format(new Date(), "yyyy-MM-dd"),
        meal_name: mealData.name,
        calories: mealData.calories,
        protein: mealData.protein,
        carbs: mealData.carbs,
        fats: mealData.fats,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutrition-logs"] });
      queryClient.invalidateQueries({ queryKey: ["nutrition-today"] });
      toast.success("Successfully logged meal to Macros");
    },
    onError: () => toast.error("Failed to log meal"),
  });

  // Quick add (+ button)
  const handleQuickAdd = (food: FoodItem) => {
    const portion = food.portions[0];
    const scale = portion ? portion.gramWeight / 100 : 1;
    logMutation.mutate({
      name: food.name,
      calories: Math.round(food.calories * scale),
      protein: Math.round(food.protein * scale * 10) / 10,
      carbs: Math.round(food.carbs * scale * 10) / 10,
      fats: Math.round(food.fats * scale * 10) / 10,
    });
    setLoggedIds(prev => new Set(prev).add(food.fdcId));
  };

  // Log from detail sheet
  const handleLogFromSheet = () => {
    if (!selectedFood) return;
    const macros = getScaledMacros();
    logMutation.mutate({ name: selectedFood.name, ...macros });
    setLoggedIds(prev => new Set(prev).add(selectedFood.fdcId));
    setSelectedFood(null);
  };

  // Manual add submit
  const handleManualAdd = () => {
    if (!manualName.trim()) { toast.error("Please enter a food name"); return; }
    logMutation.mutate({
      name: manualName.trim(),
      calories: parseInt(manualCalories) || 0,
      protein: parseFloat(manualProtein) || 0,
      carbs: parseFloat(manualCarbs) || 0,
      fats: parseFloat(manualFats) || 0,
    });
    setManualName(""); setManualCalories(""); setManualProtein(""); setManualCarbs(""); setManualFats("");
  };

  const handleProductScanned = (productData: { name: string; calories: number; protein: number; carbs: number; fats: number }) => {
    logMutation.mutate(productData);
    setScannerOpen(false);
  };

  const handlePhotoAnalyzed = (data: { name: string; calories: number; protein: number; carbs: number; fats: number }) => {
    logMutation.mutate(data);
    setPhotoAnalyzerOpen(false);
  };

  const scaledMacros = getScaledMacros();

  return (
    <ClientLayout>
      <div className="flex flex-col h-full min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Log Meal</h1>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-2 gap-3 px-4 pt-3">
          <button
            onClick={() => setPhotoAnalyzerOpen(true)}
            className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 transition-colors hover:bg-primary/10 hover:border-primary/50 active:scale-[0.98]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
              <Camera className="h-5 w-5 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">Snap & Track</p>
              <p className="text-[10px] text-muted-foreground leading-tight">AI-powered photo analysis</p>
            </div>
          </button>
          <button
            onClick={() => setScannerOpen(true)}
            className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 transition-colors hover:bg-primary/10 hover:border-primary/50 active:scale-[0.98]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
              <ScanBarcode className="h-5 w-5 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">Scan Barcode</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Instant product lookup</p>
            </div>
          </button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="search" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-3 grid grid-cols-2 w-auto">
            <TabsTrigger value="search" className="gap-1.5">
              <Search className="h-3.5 w-3.5" /> Search
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Manual Add
            </TabsTrigger>
          </TabsList>

          {/* Search Tab */}
          <TabsContent value="search" className="flex-1 px-4 mt-3">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search food..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            <div className="divide-y">
              {searchResults.map((food) => {
                const isLogged = loggedIds.has(food.fdcId);
                return (
                  <div key={food.fdcId} className="flex items-center py-3.5 gap-3">
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => {
                        setSelectedFood(food);
                        setServingCount("1");
                        setSelectedPortion(getDefaultPortion(food));
                      }}
                    >
                      <p className="font-medium text-sm truncate">{food.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        🔥 {getDefaultCalories(food)} Cal • {getDefaultPortionLabel(food)}
                      </p>
                    </div>
                    <Button
                      variant={isLogged ? "default" : "outline"}
                      size="icon"
                      className="h-9 w-9 shrink-0 rounded-lg"
                      onClick={(e) => { e.stopPropagation(); if (!isLogged) handleQuickAdd(food); }}
                      disabled={logMutation.isPending}
                    >
                      {isLogged ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>
                );
              })}
            </div>

            {!isSearching && searchResults.length === 0 && searchQuery && (
              <p className="text-center text-sm text-muted-foreground py-8">No results found</p>
            )}
          </TabsContent>

          {/* Manual Add Tab */}
          <TabsContent value="manual" className="px-4 mt-3 space-y-4">
            <div className="space-y-2">
              <Label>Food Name *</Label>
              <Input placeholder="e.g., Chicken Breast" value={manualName} onChange={(e) => setManualName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Calories</Label>
                <Input type="number" placeholder="0" value={manualCalories} onChange={(e) => setManualCalories(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Protein (g)</Label>
                <Input type="number" step="0.1" placeholder="0" value={manualProtein} onChange={(e) => setManualProtein(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Carbs (g)</Label>
                <Input type="number" step="0.1" placeholder="0" value={manualCarbs} onChange={(e) => setManualCarbs(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fats (g)</Label>
                <Input type="number" step="0.1" placeholder="0" value={manualFats} onChange={(e) => setManualFats(e.target.value)} />
              </div>
            </div>
            <Button className="w-full" onClick={handleManualAdd} disabled={logMutation.isPending}>
              {logMutation.isPending ? "Logging..." : "Log"}
            </Button>
          </TabsContent>
        </Tabs>
      </div>

      {/* Food Detail Drawer */}
      <Drawer open={!!selectedFood} onOpenChange={(open) => { if (!open) setSelectedFood(null); }}>
        <DrawerContent className="max-h-[85vh]">
          {selectedFood && (
            <div className="p-4 space-y-4">
              <DrawerHeader className="p-0">
                <p className="text-xs text-muted-foreground">Today, {format(new Date(), "h:mm a")}</p>
                <DrawerTitle className="text-lg">{selectedFood.name}</DrawerTitle>
              </DrawerHeader>

              <div className="flex gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label>Number of Serving</Label>
                  <Input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={servingCount}
                    onChange={(e) => setServingCount(e.target.value)}
                    className="text-lg h-12"
                  />
                </div>
                <div className="w-32 space-y-1.5">
                  <Label>Measurement</Label>
                  <Select value={selectedPortion} onValueChange={setSelectedPortion}>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedFood.portions.map((p) => (
                        <SelectItem key={p.unit} value={p.unit}>{p.unit}</SelectItem>
                      ))}
                      {selectedFood.portions.length === 0 && (
                        <SelectItem value="100g">100g</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Macro summary bar */}
              <div className="grid grid-cols-4 gap-2 bg-muted/50 rounded-xl p-3">
                <div className="text-center">
                  <p className="text-lg font-bold">🔥 {scaledMacros.calories}</p>
                  <p className="text-xs text-muted-foreground">Calories</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{scaledMacros.protein}g</p>
                  <p className="text-xs text-muted-foreground">Protein</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{scaledMacros.carbs}g</p>
                  <p className="text-xs text-muted-foreground">Carbs</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{scaledMacros.fats}g</p>
                  <p className="text-xs text-muted-foreground">Fat</p>
                </div>
              </div>

              <Button className="w-full h-12 text-base" onClick={handleLogFromSheet} disabled={logMutation.isPending}>
                {logMutation.isPending ? "Logging..." : "Log"}
              </Button>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      <BarcodeScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} onProductScanned={handleProductScanned} />
      <FoodPhotoAnalyzerDialog open={photoAnalyzerOpen} onOpenChange={setPhotoAnalyzerOpen} onAnalysisComplete={handlePhotoAnalyzed} />
    </ClientLayout>
  );
}
