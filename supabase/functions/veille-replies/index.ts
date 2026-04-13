import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const POSTURE_LABELS: Record<string, string> = {
  supportive: "Soutien — en faveur, défense de la position/décision",
  critical: "Critique — opposition, dénonciation, remise en question",
  neutral: "Neutre/Équilibré — analyse factuelle, prise de recul",
  official: "Réponse officielle — ton institutionnel, posture d'autorité",
  calm: "Appel au calme — apaisement, rassemblement, désescalade",
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

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Corps de requête invalide." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { trendTitle, trendResume, trendIntensite, trendSentiment, trendHashtags, position, userRole, userRegion } = body;
    if (!trendTitle || !position) {
      return new Response(JSON.stringify({ error: "trendTitle et position sont requis." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[REPLIES] Generating for "${trendTitle}" with posture: ${position}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const postureDescription = POSTURE_LABELS[position] || position;

    const systemPrompt = `Tu es un expert en communication politique digitale spécialisé en RDC.
Tu génères des répliques stratégiques pour les sujets d'actualité en RDC.
Tes posts sont courts (max 280 caractères), impactants, et optimisés pour l'engagement.
Tu tiens compte du contexte complet de l'actualité et du profil de l'utilisateur.`;

    const userPrompt = `Tu génères des répliques pour ce sujet d'actualité en RDC:

Titre: ${trendTitle}
${trendResume ? `Résumé: ${trendResume}` : ''}
${trendIntensite ? `Intensité: ${trendIntensite}` : ''}
${trendSentiment ? `Sentiment dominant: ${trendSentiment}` : ''}
${trendHashtags?.length ? `Hashtags: ${trendHashtags.join(', ')}` : ''}

Posture choisie: ${postureDescription}
${userRole ? `Profil: ${userRole}` : ''}
${userRegion ? `Basé en: ${userRegion}` : ''}

Génère exactement 5 posts Twitter/X (max 280 caractères chacun) avec les 5 tons suivants:
1. Ferme
2. Ironique
3. Rassembleur
4. Provocateur
5. Diplomatique

Adapte chaque post à la posture "${postureDescription}".
Chaque post doit inclure les hashtags tendances pertinents. Ajoute un score d'engagement estimé (0-100).`;

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
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_replies",
              description: "Return 5 Twitter reply posts with different tones and engagement scores",
              parameters: {
                type: "object",
                properties: {
                  replies: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string" },
                        tone: { type: "string", enum: ["Ferme", "Ironique", "Rassembleur", "Provocateur", "Diplomatique"] },
                        hashtags: { type: "array", items: { type: "string" } },
                        score_engagement: { type: "number" }
                      },
                      required: ["text", "tone", "hashtags", "score_engagement"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["replies"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "return_replies" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, veuillez réessayer plus tard." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits insuffisants." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("[AI ERROR]", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    let replies;
    if (toolCall) {
      try {
        replies = JSON.parse(toolCall.function.arguments);
        console.log(`[REPLIES] Generated ${replies.replies?.length || 0} replies`);
      } catch {
        console.error("[PARSE] Failed to parse tool call arguments");
        replies = { replies: [] };
      }
    } else {
      const content = data.choices?.[0]?.message?.content || "";
      const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          replies = JSON.parse(jsonMatch[0]);
        } catch {
          console.error("[PARSE] Failed to parse content JSON");
          replies = { replies: [] };
        }
      } else {
        replies = { replies: [] };
      }
    }

    if (!replies.replies || !Array.isArray(replies.replies)) replies.replies = [];

    return new Response(JSON.stringify(replies), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[FATAL] veille-replies error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
