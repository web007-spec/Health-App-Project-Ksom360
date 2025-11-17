import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    
    if (!image) {
      throw new Error('No image provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Analyzing food photo with Lovable AI...');

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
                text: 'Analyze this food image and provide nutritional estimates. Identify the main food items, estimate portion sizes, and calculate total macros. Be specific and realistic with estimates.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${image}`
                }
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
                  name: {
                    type: 'string',
                    description: 'A descriptive name of the meal/food items identified'
                  },
                  calories: {
                    type: 'number',
                    description: 'Estimated total calories'
                  },
                  protein: {
                    type: 'number',
                    description: 'Estimated protein in grams'
                  },
                  carbs: {
                    type: 'number',
                    description: 'Estimated carbohydrates in grams'
                  },
                  fats: {
                    type: 'number',
                    description: 'Estimated fats in grams'
                  }
                },
                required: ['name', 'calories', 'protein', 'carbs', 'fats']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'provide_nutrition_data' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No nutrition data returned from AI');
    }

    const nutrition = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify({ nutrition }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-food-photo:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Analysis failed' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
