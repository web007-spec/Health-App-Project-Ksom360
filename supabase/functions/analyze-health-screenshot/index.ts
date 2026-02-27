import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { image } = await req.json();
    if (!image) throw new Error('No image provided');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    console.log('Analyzing Apple Health screenshot with AI...');

    // Use AI vision to extract health data from the screenshot
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are an expert at reading Apple Health app screenshots.
Analyze this screenshot and extract ALL health metrics you can see.

IMPORTANT MAPPING RULES for data_type:
- "Move" or "Active Calories" or "Active Energy" → calories_burned
- "Exercise" minutes → active_minutes  
- "Steps" → steps
- "Heart Rate" or "Walking Heart Rate" or "Walking Heart Rate Average" → heart_rate
- "Resting Heart Rate" → resting_heart_rate
- "Workouts" (count) → workout
- Do NOT map "Stand", "Sleep Score", "Walking Speed", "Weight", "Distance" — skip these metrics.

Extract exact numbers shown on screen. If a metric is not in the mapping above, omit it entirely.
Today's date is ${new Date().toISOString().split('T')[0]}. Ignore any dates shown in the screenshot.`
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
              name: 'extract_health_metrics',
              description: 'Extract all health metrics visible in the Apple Health screenshot',
              parameters: {
                type: 'object',
                properties: {
                  metrics: {
                    type: 'array',
                    description: 'List of all health metrics extracted from the screenshot',
                    items: {
                      type: 'object',
                      properties: {
                        data_type: {
                          type: 'string',
                          enum: ['steps', 'calories_burned', 'heart_rate', 'resting_heart_rate', 'active_minutes', 'workout'],
                          description: 'The type of health metric'
                        },
                        value: {
                          type: 'number',
                          description: 'The numeric value of the metric'
                        },
                        unit: {
                          type: 'string',
                          description: 'The unit (e.g. count, kcal, bpm, min)'
                        },
                        label: {
                          type: 'string',
                          description: 'Human-readable label shown in the screenshot (e.g. "Steps", "Active Calories")'
                        }
                      },
                      required: ['data_type', 'value', 'unit', 'label']
                    }
                  },
                  summary: {
                    type: 'string',
                    description: 'Brief summary of what was detected in the screenshot'
                  }
                },
                required: ['metrics', 'summary']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_health_metrics' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits required. Please add funds to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error('AI error:', response.status, errorText);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error('No health data returned from AI');

    const extracted = JSON.parse(toolCall.function.arguments);
    console.log('Extracted metrics:', extracted.metrics.length, 'items');

    if (!extracted.metrics || extracted.metrics.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No health metrics could be detected in this screenshot. Please make sure the image shows Apple Health data clearly.",
          metrics: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Always use today's date — screenshot dates are unreliable (wrong year, partial dates)
    const now = new Date();
    const recordDate = now.toISOString().split('T')[0];
    const recordedAt = `${recordDate}T${String(now.getUTCHours()).padStart(2,'0')}:00:00Z`;

    // Save to database
    const healthRecords = extracted.metrics.map((metric: any) => ({
      client_id: user.id,
      data_type: metric.data_type,
      value: Math.round(metric.value),
      unit: metric.unit,
      recorded_at: recordedAt,
      source: 'apple_health',
      metadata: { imported_via: 'screenshot', label: metric.label }
    }));

    const { error: insertError } = await supabase
      .from('health_data')
      .upsert(healthRecords, { onConflict: 'client_id,data_type,recorded_at' });

    if (insertError) {
      console.error('DB insert error:', insertError);
      throw insertError;
    }

    // Update health connection to show as connected
    await supabase
      .from('health_connections')
      .upsert({
        client_id: user.id,
        provider: 'apple_health',
        is_connected: true,
        last_sync_at: new Date().toISOString(),
        permissions: ['heart_rate', 'steps', 'calories', 'workouts', 'active_minutes'],
      }, { onConflict: 'client_id,provider' });

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: healthRecords.length,
        metrics: extracted.metrics,
        summary: extracted.summary,
        date: recordDate
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-health-screenshot:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Analysis failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
