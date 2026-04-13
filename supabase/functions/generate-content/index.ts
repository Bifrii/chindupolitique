import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const tabPrompts: Record<string, string> = {
  crise: `Tu es un expert en gestion de crise politique en RDC. L'utilisateur décrit une crise.
Tu dois générer un plan de communication de crise en 3 phases :
- Phase 1 — Réponse immédiate (24h)
- Phase 2 — Stabilisation (1 semaine)
- Phase 3 — Reconstruction (1 mois)

Pour chaque phase, fournis : un titre, une description stratégique, et un post prêt à publier sur Facebook.`,

  image: `Tu es un expert en image publique et communication politique en RDC.
Génère un plan de campagne d'image sur 30 jours avec 4 semaines.
Pour chaque semaine, propose : un thème, un post Facebook, et une action terrain/vidéo.`,

  attaque: `Tu es un expert en réponse aux attaques politiques en RDC.
Génère exactement 3 stratégies de réponse à une attaque, chacune avec un titre, un texte de post prêt à publier, et un ton différent.`,

  viral: `Tu es un expert en viralité et communication politique digitale en RDC.
Génère exactement 3 variations de messages viraux optimisés pour l'engagement sur Twitter/X et Facebook.
Chaque post doit être percutant, max 280 caractères, avec des hashtags et un score de viralité estimé (0-100).`,
};

const toolSchemas: Record<string, any> = {
  crise: {
    name: "return_crisis_plan",
    description: "Return a 3-phase crisis plan",
    parameters: {
      type: "object",
      properties: {
        phases: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              post: { type: "string", description: "Ready-to-publish Facebook post" },
            },
            required: ["title", "description", "post"],
            additionalProperties: false,
          },
        },
      },
      required: ["phases"],
      additionalProperties: false,
    },
  },
  image: {
    name: "return_image_plan",
    description: "Return a 4-week image campaign plan",
    parameters: {
      type: "object",
      properties: {
        weeks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              week: { type: "string" },
              theme: { type: "string" },
              post: { type: "string" },
              action: { type: "string" },
            },
            required: ["week", "theme", "post", "action"],
            additionalProperties: false,
          },
        },
      },
      required: ["weeks"],
      additionalProperties: false,
    },
  },
  attaque: {
    name: "return_attack_responses",
    description: "Return 3 strategic responses to an attack",
    parameters: {
      type: "object",
      properties: {
        responses: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              text: { type: "string" },
              tone: { type: "string", enum: ["Ferme", "Diplomatique", "Rassembleur", "Ironique", "Populaire"] },
            },
            required: ["title", "text", "tone"],
            additionalProperties: false,
          },
        },
      },
      required: ["responses"],
      additionalProperties: false,
    },
  },
  viral: {
    name: "return_viral_posts",
    description: "Return 3 viral post variations",
    parameters: {
      type: "object",
      properties: {
        posts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string", description: "Max 280 characters with hashtags" },
              score: { type: "number", description: "Virality score 0-100" },
              emotion: { type: "string" },
            },
            required: ["text", "score", "emotion"],
            additionalProperties: false,
          },
        },
      },
      required: ["posts"],
      additionalProperties: false,
    },
  },
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

    const { tab, input, userProfile } = await req.json();
    if (!tab || !input) throw new Error("tab and input are required");
    if (!tabPrompts[tab]) throw new Error("Invalid tab");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let profileContext = "";
    if (userProfile) {
      profileContext = `\n\nPROFIL: ${userProfile.full_name || "inconnu"}, ${userProfile.political_role || ""}, ${userProfile.region || "RDC"}. Rayonnement: ${userProfile.rayonnement || ""}. Adapte le contenu à ce profil.`;
    }

    const schema = toolSchemas[tab];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: tabPrompts[tab] + profileContext },
          { role: "user", content: input },
        ],
        tools: [{ type: "function", function: schema }],
        tool_choice: { type: "function", function: { name: schema.name } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes." }), {
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
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
