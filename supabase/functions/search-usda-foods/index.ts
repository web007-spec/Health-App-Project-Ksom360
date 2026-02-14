import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    // Search USDA FoodData Central
    const searchUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}`;
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: sanitizedQuery,
        pageSize: clampedPageSize,
        dataType: ['Foundation', 'SR Legacy', 'Branded'],
        sortBy: 'dataType.keyword',
        sortOrder: 'asc',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('USDA API error:', response.status, errorText);
      throw new Error(`USDA API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform results into a clean format
    const foods = (data.foods || []).map((food: any) => {
      const nutrients = food.foodNutrients || [];

      const getNutrient = (ids: number[]) => {
        for (const id of ids) {
          const n = nutrients.find((n: any) => n.nutrientId === id);
          if (n) return Math.round((n.value || 0) * 10) / 10;
        }
        return 0;
      };

      return {
        fdcId: food.fdcId,
        name: food.description || food.lowercaseDescription || 'Unknown',
        brandOwner: food.brandOwner || null,
        servingSize: food.servingSize || 100,
        servingSizeUnit: food.servingSizeUnit || 'g',
        calories: getNutrient([1008, 2048]),
        protein: getNutrient([1003]),
        carbs: getNutrient([1005]),
        fats: getNutrient([1004]),
        fiber: getNutrient([1079]),
        sugar: getNutrient([2000, 1063]),
        dataType: food.dataType,
      };
    });

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
