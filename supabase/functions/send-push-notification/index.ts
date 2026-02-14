import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Convert base64url to Uint8Array
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Create JWT for VAPID auth
async function createVapidJwt(
  audience: string,
  subject: string,
  privateKeyBase64Url: string
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key
  const privateKeyBytes = base64UrlToUint8Array(privateKeyBase64Url);
  
  // Build JWK from the raw private key d value
  const publicKeyHex = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const publicKeyBytes = base64UrlToUint8Array(publicKeyHex);
  
  // Extract x and y from uncompressed public key (first byte is 0x04)
  const x = btoa(String.fromCharCode(...publicKeyBytes.slice(1, 33))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const y = btoa(String.fromCharCode(...publicKeyBytes.slice(33, 65))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const jwk = {
    kty: "EC",
    crv: "P-256",
    x,
    y,
    d: privateKeyBase64Url,
  };

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    encoder.encode(unsignedToken)
  );

  // Convert DER signature to raw format for JWT
  const sigBytes = new Uint8Array(signature);
  const sigB64 = btoa(String.fromCharCode(...sigBytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  return `${unsignedToken}.${sigB64}`;
}

// Send a single web push notification
async function sendWebPush(
  subscription: any,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<boolean> {
  try {
    const endpoint = subscription.endpoint;
    const url = new URL(endpoint);
    const audience = `${url.protocol}//${url.host}`;

    const jwt = await createVapidJwt(audience, vapidSubject, vapidPrivateKey);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        TTL: "86400",
        Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
      },
      body: payload,
    });

    if (!response.ok) {
      console.error(`Push failed: ${response.status} ${await response.text()}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending web push:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured. Run generate-vapid-keys first." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { user_ids, title, body, data, url } = await req.json();

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "user_ids array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get push subscriptions for the target users
    const { data: preferences, error: prefsError } = await supabase
      .from("notification_preferences")
      .select("user_id, push_subscription")
      .in("user_id", user_ids)
      .eq("push_enabled", true)
      .not("push_subscription", "is", null);

    if (prefsError) throw prefsError;

    if (!preferences || preferences.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users with push subscriptions", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({
      title: title || "EverFit Stride",
      body: body || "You have a new notification",
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      data: { url: url || "/", ...data },
    });

    let sent = 0;
    let failed = 0;

    for (const pref of preferences) {
      const subscription = pref.push_subscription;
      if (!subscription) continue;

      // For now, use a simpler approach - just send the payload directly
      // Full encryption requires the web-push protocol which is complex
      // Instead, we'll use the simpler fetch approach
      try {
        const endpoint = (subscription as any).endpoint;
        if (!endpoint) continue;

        const audience = new URL(endpoint);
        const jwt = await createVapidJwt(
          `${audience.protocol}//${audience.host}`,
          "mailto:notifications@everfitstride.com",
          vapidPrivateKey
        );

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            TTL: "86400",
            Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
            "Content-Type": "application/json",
          },
          body: payload,
        });

        if (response.ok || response.status === 201) {
          sent++;
          console.log(`Push sent to user ${pref.user_id}`);
        } else {
          failed++;
          const text = await response.text();
          console.error(`Push failed for user ${pref.user_id}: ${response.status} ${text}`);
          
          // If subscription is expired/invalid, remove it
          if (response.status === 404 || response.status === 410) {
            await supabase
              .from("notification_preferences")
              .update({ push_subscription: null, push_enabled: false })
              .eq("user_id", pref.user_id);
          }
        }
      } catch (err) {
        failed++;
        console.error(`Error sending to user ${pref.user_id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: preferences.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
