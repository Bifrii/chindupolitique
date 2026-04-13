import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Allow both authenticated and guest requests
    const authHeader = req.headers.get("Authorization");
    let user = null;
    if (authHeader?.startsWith("Bearer ") && !authHeader.includes(Deno.env.get("SUPABASE_ANON_KEY")!)) {
      const supabaseClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
      const { data: { user: authUser } } = await supabaseClient.auth.getUser();
      user = authUser;
    }

    const { messages, userProfile } = await req.json();
    if (!messages || !Array.isArray(messages)) throw new Error("messages array is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let profileContext = "";
    if (userProfile) {
      profileContext = `\n\nPROFIL DE L'UTILISATEUR:
L'utilisateur s'appelle ${userProfile.full_name || "inconnu"}.
Son rôle politique est ${userProfile.political_role || "non spécifié"}.
Il opère principalement en ${userProfile.region || "RDC"}, RDC.
Son rayonnement est ${userProfile.rayonnement || "non spécifié"}.
Ses objectifs prioritaires sont : ${(userProfile.objectifs || []).join(", ") || "non spécifiés"}.
Adapte toutes tes réponses à son profil et contexte spécifique.`;
    }

    const systemPrompt = `Je suis votre conseiller politique stratégique spécialisé en communication politique en RDC.
Je connais les dynamiques politiques locales, les figures influentes, les enjeux ethniques, régionaux et institutionnels.

Pour chaque réponse, je fournis :
- Une analyse stratégique détaillée
- Des recommandations concrètes et actionnables
- Des suggestions de posts pour les réseaux sociaux quand pertinent
- Des prochaines étapes recommandées

Je m'exprime toujours en français et adapte mes conseils au contexte politique congolais.
J'utilise le formatage Markdown pour structurer mes réponses.${profileContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
