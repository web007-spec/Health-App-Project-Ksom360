import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web Push requires VAPID (Voluntary Application Server Identification)
// We generate keys once and store them as secrets

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if VAPID keys already exist
    const existingPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const existingPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (existingPublicKey && existingPrivateKey) {
      return new Response(
        JSON.stringify({ 
          publicKey: existingPublicKey,
          message: "VAPID keys already configured" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate ECDSA P-256 key pair for VAPID
    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"]
    );

    const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
    const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

    const publicKeyBase64Url = arrayBufferToBase64Url(publicKeyRaw);
    const privateKeyBase64Url = privateKeyJwk.d!;

    return new Response(
      JSON.stringify({
        publicKey: publicKeyBase64Url,
        privateKey: privateKeyBase64Url,
        message: "VAPID keys generated. Store these as secrets: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY",
        instructions: "Add these as secrets in your project settings"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
