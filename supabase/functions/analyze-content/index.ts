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

    const { content, relation, userProfile } = await req.json();
    if (!content || !relation) throw new Error("content and relation are required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let profileContext = "";
    if (userProfile) {
      profileContext = `\n\nPROFIL DE L'UTILISATEUR:
L'utilisateur s'appelle ${userProfile.full_name || "inconnu"}.
Son rôle politique est ${userProfile.political_role || "non spécifié"}.
Il opère principalement en ${userProfile.region || "RDC"}, RDC.
Son rayonnement est ${userProfile.rayonnement || "non spécifié"}.
Adapte tes analyses et réponses à son profil spécifique.`;
    }

    const systemPrompt = `Tu es un expert en analyse de communication politique en RDC (République Démocratique du Congo).
Tu analyses des contenus politiques (discours, publications, messages) et tu fournis :
1. Les forces du message
2. Les faiblesses et vulnérabilités
3. L'intention probable de l'auteur
4. Le niveau de dangerosité (low, medium, high)
5. Exactement 3 réponses stratégiques adaptées au contexte congolais

Chaque réponse doit être un post complet prêt à publier sur les réseaux sociaux.
Adapte ton analyse en fonction de la relation avec l'auteur.${profileContext}`;

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
          {
            role: "user",
            content: `Analyse ce contenu politique. La relation avec l'auteur est : ${relation}.

Contenu à analyser :
"${content}"`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_analysis",
              description: "Return the political content analysis",
              parameters: {
                type: "object",
                properties: {
                  forces: { type: "array", items: { type: "string" }, description: "3-5 strengths of the message" },
                  faiblesses: { type: "array", items: { type: "string" }, description: "3-5 weaknesses" },
                  intention: { type: "string", description: "Probable intention of the author" },
                  dangerosite: { type: "string", enum: ["low", "medium", "high"] },
                  reponses: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        text: { type: "string", description: "Full social media post text" },
                        platform: { type: "string", enum: ["Facebook", "Twitter/X", "WhatsApp"] },
                        tone: { type: "string", enum: ["Ferme", "Diplomatique", "Populaire", "Ironique", "Rassembleur"] },
                      },
                      required: ["title", "text", "platform", "tone"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["forces", "faiblesses", "intention", "dangerosite", "reponses"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_analysis" } },
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
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let analysis;
    if (toolCall) {
      analysis = JSON.parse(toolCall.function.arguments);
    } else {
      throw new Error("No tool call in response");
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
