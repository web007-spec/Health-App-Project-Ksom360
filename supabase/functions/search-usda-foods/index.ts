import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Common portion estimates for food categories (gramWeight per 1 unit)
const COMMON_PORTIONS: Record<string, { unit: string; gramWeight: number }[]> = {
  egg: [
    { unit: '1 large egg', gramWeight: 50 },
    { unit: '1 medium egg', gramWeight: 44 },
    { unit: '1 small egg', gramWeight: 38 },
  ],
  chicken: [
    { unit: '1 breast (6 oz)', gramWeight: 170 },
    { unit: '1 thigh', gramWeight: 116 },
    { unit: '1 drumstick', gramWeight: 96 },
  ],
  rice: [
    { unit: '1 cup cooked', gramWeight: 186 },
    { unit: '1 cup dry', gramWeight: 185 },
  ],
  milk: [
    { unit: '1 cup (8 fl oz)', gramWeight: 244 },
    { unit: '1 tbsp', gramWeight: 15 },
  ],
  butter: [
    { unit: '1 tbsp', gramWeight: 14 },
    { unit: '1 pat', gramWeight: 5 },
    { unit: '1 stick', gramWeight: 113 },
  ],
  cheese: [
    { unit: '1 slice', gramWeight: 28 },
    { unit: '1 cup shredded', gramWeight: 113 },
  ],
  bread: [
    { unit: '1 slice', gramWeight: 30 },
  ],
  oil: [
    { unit: '1 tbsp', gramWeight: 14 },
    { unit: '1 tsp', gramWeight: 5 },
  ],
  sugar: [
    { unit: '1 tbsp', gramWeight: 12.5 },
    { unit: '1 tsp', gramWeight: 4 },
    { unit: '1 cup', gramWeight: 200 },
  ],
  flour: [
    { unit: '1 cup', gramWeight: 125 },
    { unit: '1 tbsp', gramWeight: 8 },
  ],
  banana: [
    { unit: '1 medium', gramWeight: 118 },
    { unit: '1 large', gramWeight: 136 },
  ],
  apple: [
    { unit: '1 medium', gramWeight: 182 },
    { unit: '1 large', gramWeight: 223 },
  ],
  potato: [
    { unit: '1 medium', gramWeight: 150 },
    { unit: '1 large', gramWeight: 299 },
  ],
  oat: [
    { unit: '1 cup dry', gramWeight: 81 },
    { unit: '1 cup cooked', gramWeight: 234 },
  ],
  yogurt: [
    { unit: '1 cup', gramWeight: 245 },
    { unit: '1 container (6 oz)', gramWeight: 170 },
  ],
  salmon: [
    { unit: '1 fillet (6 oz)', gramWeight: 170 },
  ],
  beef: [
    { unit: '1 patty (4 oz)', gramWeight: 113 },
    { unit: '3 oz serving', gramWeight: 85 },
  ],
  avocado: [
    { unit: '1 whole', gramWeight: 150 },
    { unit: '1/2 avocado', gramWeight: 75 },
  ],
};

function getCommonPortions(foodName: string): { unit: string; gramWeight: number; amount: number }[] {
  const lower = foodName.toLowerCase();
  for (const [keyword, portions] of Object.entries(COMMON_PORTIONS)) {
    if (lower.includes(keyword)) {
      return portions.map(p => ({ ...p, amount: 1 }));
    }
  }
  return [
    { amount: 1, unit: '1 cup', gramWeight: 240 },
    { amount: 1, unit: '1 tbsp', gramWeight: 15 },
    { amount: 1, unit: '1 tsp', gramWeight: 5 },
  ];
}

interface NormalizedFood {
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
  portions: { amount: number; unit: string; gramWeight: number }[];
}

// ── USDA Search ──
async function searchUSDA(query: string, pageSize: number): Promise<NormalizedFood[]> {
  const USDA_API_KEY = Deno.env.get('USDA_API_KEY');
  if (!USDA_API_KEY) {
    console.warn('USDA_API_KEY not configured, skipping USDA search');
    return [];
  }

  const fetchSize = Math.min(pageSize * 3, 50);
  const searchUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}`;
  const response = await fetch(searchUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      pageSize: fetchSize,
      dataType: ['Foundation', 'SR Legacy', 'Branded'],
    }),
  });

  if (!response.ok) {
    console.error('USDA API error:', response.status, await response.text());
    return [];
  }

  const data = await response.json();

  return (data.foods || []).map((food: any) => {
    const nutrients = food.foodNutrients || [];
    const getNutrient = (ids: number[]) => {
      for (const id of ids) {
        const n = nutrients.find((n: any) => n.nutrientId === id);
        if (n) return Math.round((n.value || 0) * 10) / 10;
      }
      return 0;
    };

    const usdaPortions = (food.foodMeasures || food.foodPortions || []).map((p: any) => ({
      amount: p.amount || p.measureUnitNumber || 1,
      unit: (p.disseminationText || p.measureUnitName || p.modifier || 'serving').trim(),
      gramWeight: p.gramWeight || 100,
    })).filter((p: any) => p.gramWeight > 0 && p.unit !== 'Quantity not specified' && p.unit !== 'serving');

    const foodName = food.description || food.lowercaseDescription || '';
    const commonPortions = getCommonPortions(foodName);
    const existingUnits = new Set(usdaPortions.map((p: any) => p.unit.toLowerCase()));
    const extraPortions = commonPortions.filter(cp => !existingUnits.has(cp.unit.toLowerCase()));
    const portions = [...usdaPortions, ...extraPortions];

    let servingSizeUnit = food.servingSizeUnit || 'g';
    servingSizeUnit = servingSizeUnit.replace(/GRM/i, 'g').replace(/MLT/i, 'ml').replace(/UNT/i, 'unit');

    return {
      fdcId: food.fdcId,
      name: foodName || 'Unknown',
      brandOwner: food.brandOwner || null,
      servingSize: food.servingSize ? Math.round(food.servingSize * 10) / 10 : 100,
      servingSizeUnit,
      calories: getNutrient([1008, 2048]),
      protein: getNutrient([1003]),
      carbs: getNutrient([1005]),
      fats: getNutrient([1004]),
      fiber: getNutrient([1079]),
      sugar: getNutrient([2000, 1063]),
      dataType: food.dataType,
      portions,
    };
  });
}

// ── Open Food Facts Search ──
async function searchOpenFoodFacts(query: string, pageSize: number): Promise<NormalizedFood[]> {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${pageSize}&fields=code,product_name,brands,nutriments,serving_size,serving_quantity`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'EverFitStride/1.0 (fitness-app)' },
    });

    if (!response.ok) {
      console.error('Open Food Facts error:', response.status);
      return [];
    }

    const data = await response.json();

    return (data.products || [])
      .filter((p: any) => p.product_name && p.nutriments)
      .map((product: any) => {
        const n = product.nutriments || {};
        const servingGrams = product.serving_quantity || 100;

        // Build portions from serving size
        const portions: { amount: number; unit: string; gramWeight: number }[] = [];
        if (product.serving_size) {
          portions.push({
            amount: 1,
            unit: `1 serving (${product.serving_size})`,
            gramWeight: servingGrams,
          });
        }

        return {
          fdcId: parseInt(product.code?.replace(/\D/g, '').slice(0, 9) || '0', 10) || Math.floor(Math.random() * 900000) + 100000,
          name: product.product_name,
          brandOwner: product.brands || null,
          servingSize: servingGrams,
          servingSizeUnit: 'g',
          // All values per 100g
          calories: Math.round((n['energy-kcal_100g'] || n['energy_100g'] / 4.184 || 0) * 10) / 10,
          protein: Math.round((n.proteins_100g || 0) * 10) / 10,
          carbs: Math.round((n.carbohydrates_100g || 0) * 10) / 10,
          fats: Math.round((n.fat_100g || 0) * 10) / 10,
          fiber: Math.round((n.fiber_100g || 0) * 10) / 10,
          sugar: Math.round((n.sugars_100g || 0) * 10) / 10,
          dataType: 'Open Food Facts',
          portions,
        };
      })
      .filter((f: NormalizedFood) => f.calories > 0 || f.protein > 0 || f.carbs > 0 || f.fats > 0);
  } catch (err) {
    console.error('Open Food Facts search failed:', err);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, pageSize = 10 } = await req.json();

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ foods: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sanitizedQuery = query.trim().slice(0, 200);
    const clampedPageSize = Math.min(Math.max(1, pageSize), 25);

    // Search both sources in parallel
    const [usdaResults, offResults] = await Promise.all([
      searchUSDA(sanitizedQuery, clampedPageSize),
      searchOpenFoodFacts(sanitizedQuery, Math.ceil(clampedPageSize / 2)),
    ]);

    // Merge: USDA first, then Open Food Facts (deduplicate by name similarity)
    const usdaNames = new Set(usdaResults.map(f => f.name.toLowerCase().trim()));
    const uniqueOFF = offResults.filter(f => {
      const lower = f.name.toLowerCase().trim();
      // Skip if USDA already has a very similar item
      for (const uName of usdaNames) {
        if (uName.includes(lower) || lower.includes(uName)) return false;
      }
      return true;
    });

    let foods = [...usdaResults, ...uniqueOFF];

    // Sort: Foundation > SR Legacy > Open Food Facts branded > Branded
    const dataTypePriority: Record<string, number> = {
      'Foundation': 0,
      'SR Legacy': 1,
      'Open Food Facts': 2,
      'Branded': 3,
    };

    foods.sort((a, b) => {
      const typeDiff = (dataTypePriority[a.dataType] ?? 3) - (dataTypePriority[b.dataType] ?? 3);
      if (typeDiff !== 0) return typeDiff;
      const scoreItem = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes('dried') || lower.includes('powder')) return 4;
        if (lower.includes('white') || lower.includes('yolk')) return 3;
        if (lower.includes('whole')) return 0;
        return 1;
      };
      return scoreItem(a.name) - scoreItem(b.name);
    });

    foods = foods.slice(0, clampedPageSize);

    return new Response(
      JSON.stringify({ foods }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in search-usda-foods:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Search failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
