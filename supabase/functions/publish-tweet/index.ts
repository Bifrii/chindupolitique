import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = user.id;

    const { postId, content } = await req.json();
    if (!content?.trim()) {
      return new Response(JSON.stringify({ error: "Contenu vide" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user's Twitter tokens
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("twitter_tokens")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ error: "Compte Twitter non connecté. Allez dans Paramètres pour connecter votre compte." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = tokenData.access_token;

    // Check if token expired, refresh if needed
    if (tokenData.expires_at && new Date(tokenData.expires_at) <= new Date()) {
      if (!tokenData.refresh_token) {
        return new Response(JSON.stringify({ error: "Token expiré. Reconnectez votre compte Twitter dans les paramètres." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const TWITTER_CLIENT_ID = Deno.env.get("TWITTER_CLIENT_ID")!;
      const TWITTER_CLIENT_SECRET = Deno.env.get("TWITTER_CLIENT_SECRET")!;
      const basicAuth = btoa(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`);

      const refreshRes = await fetch("https://api.x.com/2/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokenData.refresh_token,
        }),
      });

      if (!refreshRes.ok) {
        console.error("Token refresh failed:", await refreshRes.text());
        return new Response(JSON.stringify({ error: "Impossible de rafraîchir le token. Reconnectez votre compte Twitter." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newTokens = await refreshRes.json();
      accessToken = newTokens.access_token;

      await supabaseAdmin.from("twitter_tokens").update({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token || tokenData.refresh_token,
        expires_at: newTokens.expires_in
          ? new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
          : tokenData.expires_at,
      }).eq("user_id", userId);
    }

    // Publish tweet
    const tweetRes = await fetch("https://api.x.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: content.slice(0, 280) }),
    });

    const tweetData = await tweetRes.json();

    if (!tweetRes.ok) {
      console.error("Tweet publish failed:", tweetRes.status, JSON.stringify(tweetData));

      // Log failure
      await supabaseAdmin.from("api_logs").insert({
        user_id: userId,
        action: "publish_tweet",
        status: "error",
        details: { error: tweetData, status: tweetRes.status },
      });

      // Update post status if postId provided
      if (postId) {
        await supabaseAdmin.from("posts_planifies").update({
          status: "echoue",
        }).eq("id", postId);
      }

      return new Response(JSON.stringify({ error: `Erreur Twitter: ${tweetData?.detail || tweetData?.title || "Publication échouée"}` }), {
        status: tweetRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tweetId = tweetData.data?.id;

    // Log success
    await supabaseAdmin.from("api_logs").insert({
      user_id: userId,
      action: "publish_tweet",
      status: "success",
      details: { tweet_id: tweetId },
    });

    // Update post status if postId provided
    if (postId) {
      await supabaseAdmin.from("posts_planifies").update({
        status: "publie",
      }).eq("id", postId);
    }

    return new Response(JSON.stringify({ success: true, tweet_id: tweetId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("publish-tweet error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
