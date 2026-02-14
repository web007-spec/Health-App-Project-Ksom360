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
  // Default common portions for any food
  return [
    { amount: 1, unit: '1 cup', gramWeight: 240 },
    { amount: 1, unit: '1 tbsp', gramWeight: 15 },
    { amount: 1, unit: '1 tsp', gramWeight: 5 },
  ];
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

    const USDA_API_KEY = Deno.env.get('USDA_API_KEY');
    if (!USDA_API_KEY) {
      throw new Error('USDA_API_KEY not configured');
    }

    const sanitizedQuery = query.trim().slice(0, 200);
    const clampedPageSize = Math.min(Math.max(1, pageSize), 25);

    // Search USDA FoodData Central - fetch more to allow resorting
    const fetchSize = Math.min(clampedPageSize * 3, 50);
    const searchUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}`;
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: sanitizedQuery,
        pageSize: fetchSize,
        dataType: ['Foundation', 'SR Legacy', 'Branded'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('USDA API error:', response.status, errorText);
      throw new Error(`USDA API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform search results
    let foods = (data.foods || []).map((food: any) => {
      const nutrients = food.foodNutrients || [];

      const getNutrient = (ids: number[]) => {
        for (const id of ids) {
          const n = nutrients.find((n: any) => n.nutrientId === id);
          if (n) return Math.round((n.value || 0) * 10) / 10;
        }
        return 0;
      };

      // Extract food portions/measures from search results
      const usdaPortions = (food.foodMeasures || food.foodPortions || []).map((p: any) => ({
        amount: p.amount || p.measureUnitNumber || 1,
        unit: (p.disseminationText || p.measureUnitName || p.modifier || 'serving').trim(),
        gramWeight: p.gramWeight || 100,
      })).filter((p: any) => p.gramWeight > 0 && p.unit !== 'Quantity not specified' && p.unit !== 'serving');

      // Use USDA portions first, then supplement with common portions
      const foodName = food.description || food.lowercaseDescription || '';
      const commonPortions = getCommonPortions(foodName);
      // Merge: USDA portions take priority, add common ones that don't duplicate
      const existingUnits = new Set(usdaPortions.map((p: any) => p.unit.toLowerCase()));
      const extraPortions = commonPortions.filter(cp => !existingUnits.has(cp.unit.toLowerCase()));
      const portions = [...usdaPortions, ...extraPortions];

      let servingSizeUnit = food.servingSizeUnit || 'g';
      servingSizeUnit = servingSizeUnit.replace(/GRM/i, 'g').replace(/MLT/i, 'ml').replace(/UNT/i, 'unit');
      const servingSize = food.servingSize ? Math.round(food.servingSize * 10) / 10 : 100;

      return {
        fdcId: food.fdcId,
        name: foodName || 'Unknown',
        brandOwner: food.brandOwner || null,
        servingSize,
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

    // Sort: Foundation & SR Legacy first, then Branded
    // Within same type, prefer "whole" and deprioritize parts like "white", "yolk", "dried"
    const dataTypePriority: Record<string, number> = { 'Foundation': 0, 'SR Legacy': 1, 'Branded': 2 };
    const queryLower = sanitizedQuery.toLowerCase();
    foods.sort((a: any, b: any) => {
      const typeDiff = (dataTypePriority[a.dataType] ?? 2) - (dataTypePriority[b.dataType] ?? 2);
      if (typeDiff !== 0) return typeDiff;
      // Within same data type, score by relevance
      const scoreItem = (name: string) => {
        const lower = name.toLowerCase();
        const isDried = lower.includes('dried') || lower.includes('powder');
        const isPart = lower.includes('white') || lower.includes('yolk');
        // Penalize dried/powder forms heavily
        if (isDried) return 4;
        // Penalize parts (white, yolk) 
        if (isPart) return 3;
        // Prefer "whole" items
        if (lower.includes('whole')) return 0;
        // Normal items
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
