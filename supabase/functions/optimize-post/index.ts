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
    const _supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await _supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { content, platforms, category, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Tu es un expert en stratégie de contenu digital pour le marché congolais (RDC). 
Tu optimises les publications politiques pour maximiser leur impact et leur portée. 
Tu connais les habitudes de consommation des réseaux sociaux en RDC, 
les heures de pointe par plateforme, et les formats qui génèrent le plus d'engagement 
dans le contexte politique congolais. Tu adaptes chaque post au format et au ton 
de chaque plateforme. Tu réponds TOUJOURS en JSON valide.`;

    let userPrompt = "";

    if (type === "optimize") {
      userPrompt = `Optimise ce post pour les plateformes suivantes: ${platforms.join(", ")}.
Catégorie: ${category}

Post original:
"${content}"

Réponds en JSON avec cette structure exacte:
{
  "optimized": {
    "twitter": { "text": "...", "hashtags": ["..."], "score": 85 },
    "facebook": { "text": "...", "hashtags": ["..."], "score": 80 },
    "whatsapp": { "text": "...", "score": 75 },
    "instagram": { "text": "...", "hashtags": ["..."], "score": 82 }
  },
  "best_time": { "day": "Mardi", "time": "19:00", "reason": "..." },
  "overall_score": 82
}
Ne retourne QUE les plateformes demandées. Le texte Twitter doit faire max 280 caractères.`;
    } else if (type === "timing") {
      userPrompt = `Analyse les meilleurs moments pour publier sur ${platforms[0]} pour un contenu de catégorie "${category}" en RDC.

Réponds en JSON avec cette structure exacte:
{
  "slots": [
    { "day": "Lundi", "time": "19:00-21:00", "score": 95, "reason": "..." },
    { "day": "Mercredi", "time": "12:00-14:00", "score": 85, "reason": "..." },
    { "day": "Vendredi", "time": "18:00-20:00", "score": 80, "reason": "..." }
  ],
  "best_day": "Lundi",
  "summary": "..."
}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez plus tard." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits insuffisants." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content || "";
    
    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) text = jsonMatch[1].trim();

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      result = { raw: text };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("optimize-post error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
