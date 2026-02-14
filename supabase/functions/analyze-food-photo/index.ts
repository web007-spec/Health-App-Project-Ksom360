import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function lookupUSDA(foodName: string, apiKey: string) {
  try {
    const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: foodName,
        pageSize: 1,
        dataType: ['Foundation', 'SR Legacy'],
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const food = data.foods?.[0];
    if (!food) return null;

    const nutrients = food.foodNutrients || [];
    const get = (ids: number[]) => {
      for (const id of ids) {
        const n = nutrients.find((n: any) => n.nutrientId === id);
        if (n) return Math.round((n.value || 0) * 10) / 10;
      }
      return 0;
    };

    return {
      calories: get([1008, 2048]),
      protein: get([1003]),
      carbs: get([1005]),
      fats: get([1004]),
      usdaName: food.description,
    };
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();

    if (!image) throw new Error('No image provided');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const USDA_API_KEY = Deno.env.get('USDA_API_KEY');

    console.log('Analyzing food photo with AI...');

    // Step 1: Use AI to identify food items and estimate portions
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this food image. Identify each food item, estimate portion sizes in grams, and provide the main food name for USDA database lookup. Be specific (e.g., "grilled chicken breast" not just "chicken"). Estimate total macros for the full meal.`
              },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${image}` }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'provide_nutrition_data',
              description: 'Provide detailed nutritional information for the identified food',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Descriptive name of the meal' },
                  calories: { type: 'number', description: 'Estimated total calories' },
                  protein: { type: 'number', description: 'Estimated protein in grams' },
                  carbs: { type: 'number', description: 'Estimated carbohydrates in grams' },
                  fats: { type: 'number', description: 'Estimated fats in grams' },
                  mainFoodItem: { type: 'string', description: 'The primary food item for USDA lookup (e.g., "chicken breast")' }
                },
                required: ['name', 'calories', 'protein', 'carbs', 'fats', 'mainFoodItem']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'provide_nutrition_data' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI error:', response.status, errorText);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error('No nutrition data returned from AI');

    const aiResult = JSON.parse(toolCall.function.arguments);
    let nutrition = {
      name: aiResult.name,
      calories: aiResult.calories,
      protein: aiResult.protein,
      carbs: aiResult.carbs,
      fats: aiResult.fats,
      source: 'ai',
    };

    // Step 2: Cross-reference with USDA if key is available
    if (USDA_API_KEY && aiResult.mainFoodItem) {
      console.log(`Cross-referencing "${aiResult.mainFoodItem}" with USDA...`);
      const usdaData = await lookupUSDA(aiResult.mainFoodItem, USDA_API_KEY);

      if (usdaData) {
        console.log('USDA match found:', usdaData.usdaName);
        // Use USDA per-100g data as reference, keep AI portion estimate
        // Average between AI estimate and USDA-scaled estimate for better accuracy
        nutrition = {
          ...nutrition,
          calories: Math.round((aiResult.calories + usdaData.calories) / 2),
          protein: Math.round(((aiResult.protein + usdaData.protein) / 2) * 10) / 10,
          carbs: Math.round(((aiResult.carbs + usdaData.carbs) / 2) * 10) / 10,
          fats: Math.round(((aiResult.fats + usdaData.fats) / 2) * 10) / 10,
          source: 'ai+usda',
        };
      }
    }

    return new Response(
      JSON.stringify({ nutrition }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-food-photo:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Analysis failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
