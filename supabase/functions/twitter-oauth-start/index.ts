import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: corsHeaders });
    }
    const userId = user.id;

    const TWITTER_CLIENT_ID = Deno.env.get("TWITTER_CLIENT_ID");
    if (!TWITTER_CLIENT_ID) throw new Error("TWITTER_CLIENT_ID non configuré");

    // Generate PKCE code_verifier and code_challenge
    const verifierBytes = new Uint8Array(32);
    crypto.getRandomValues(verifierBytes);
    const codeVerifier = base64url(verifierBytes);

    const encoder = new TextEncoder();
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(codeVerifier));
    const codeChallenge = base64url(new Uint8Array(digest));

    // Generate state with userId
    const stateBytes = new Uint8Array(16);
    crypto.getRandomValues(stateBytes);
    const state = base64url(stateBytes);

    // Store verifier + userId in database for callback
    const { error: insertError } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    ).from("twitter_oauth_states").insert({
      state,
      code_verifier: codeVerifier,
      user_id: userId,
    });

    if (insertError) {
      console.error("State insert error:", insertError);
      throw new Error("Erreur de stockage de l'état OAuth");
    }

    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/twitter-oauth-callback`;
    const scopes = "tweet.read tweet.write users.read offline.access";

    const authUrl = `https://twitter.com/i/oauth2/authorize?` +
      `response_type=code&` +
      `client_id=${TWITTER_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(callbackUrl)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${state}&` +
      `code_challenge=${codeChallenge}&` +
      `code_challenge_method=S256`;

    return new Response(JSON.stringify({ url: authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("twitter-oauth-start error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
