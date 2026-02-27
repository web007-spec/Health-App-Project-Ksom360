import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const TENOR_API_KEY = Deno.env.get("TENOR_API_KEY");
  if (!TENOR_API_KEY) {
    return new Response(JSON.stringify({ error: "TENOR_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { query, limit = 20 } = await req.json();

    const endpoint = query?.trim()
      ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&client_key=fitcoach&limit=${limit}&media_filter=gif,tinygif`
      : `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&client_key=fitcoach&limit=${limit}&media_filter=gif,tinygif`;

    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Tenor API error [${response.status}]: ${await response.text()}`);
    }

    const data = await response.json();

    const gifs = (data.results || []).map((r: any) => ({
      id: r.id,
      title: r.title || "",
      preview: r.media_formats?.tinygif?.url || r.media_formats?.gif?.url || "",
      url: r.media_formats?.gif?.url || "",
      width: r.media_formats?.gif?.dims?.[0] || 200,
      height: r.media_formats?.gif?.dims?.[1] || 200,
    }));

    return new Response(JSON.stringify({ gifs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("GIF search error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
