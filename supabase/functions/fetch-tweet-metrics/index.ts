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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user's Twitter tokens
    const { data: tokenData } = await supabaseAdmin
      .from("twitter_tokens")
      .select("access_token")
      .eq("user_id", userId)
      .single();

    if (!tokenData) {
      return new Response(JSON.stringify({ error: "Compte Twitter non connecté" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get published tweets from api_logs
    const { data: logs } = await supabaseAdmin
      .from("api_logs")
      .select("details")
      .eq("user_id", userId)
      .eq("action", "publish_tweet")
      .eq("status", "success")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!logs || logs.length === 0) {
      return new Response(JSON.stringify({ metrics: [], aggregate: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tweetIds = logs
      .map((l: any) => l.details?.tweet_id)
      .filter(Boolean);

    if (tweetIds.length === 0) {
      return new Response(JSON.stringify({ metrics: [], aggregate: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch metrics for each tweet (batch max 100)
    const ids = tweetIds.slice(0, 100).join(",");
    const metricsRes = await fetch(
      `https://api.x.com/2/tweets?ids=${ids}&tweet.fields=public_metrics,created_at,text`,
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );

    if (!metricsRes.ok) {
      const errText = await metricsRes.text();
      console.error("Metrics fetch failed:", metricsRes.status, errText);
      return new Response(JSON.stringify({ error: "Erreur lors de la récupération des métriques" }), {
        status: metricsRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metricsData = await metricsRes.json();
    const tweets = metricsData.data || [];

    const metrics = tweets.map((t: any) => ({
      tweet_id: t.id,
      text: t.text,
      created_at: t.created_at,
      impressions: t.public_metrics?.impression_count || 0,
      likes: t.public_metrics?.like_count || 0,
      retweets: t.public_metrics?.retweet_count || 0,
      replies: t.public_metrics?.reply_count || 0,
    }));

    // Aggregate stats
    const totalImpressions = metrics.reduce((s: number, m: any) => s + m.impressions, 0);
    const totalLikes = metrics.reduce((s: number, m: any) => s + m.likes, 0);
    const totalRetweets = metrics.reduce((s: number, m: any) => s + m.retweets, 0);
    const totalReplies = metrics.reduce((s: number, m: any) => s + m.replies, 0);
    const bestPost = metrics.reduce((best: any, m: any) =>
      (m.likes + m.retweets) > ((best?.likes || 0) + (best?.retweets || 0)) ? m : best
    , null);

    const avgEngagement = metrics.length > 0
      ? ((totalLikes + totalRetweets + totalReplies) / Math.max(totalImpressions, 1) * 100).toFixed(2)
      : "0";

    return new Response(JSON.stringify({
      metrics,
      aggregate: {
        total_impressions: totalImpressions,
        total_likes: totalLikes,
        total_retweets: totalRetweets,
        total_replies: totalReplies,
        avg_engagement_rate: parseFloat(avgEngagement),
        best_post: bestPost,
        tweets_count: metrics.length,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-tweet-metrics error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
