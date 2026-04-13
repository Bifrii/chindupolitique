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

    const { political_role, region, full_name } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const roleName = political_role || "acteur politique";
    const regionName = region || "RDC";
    const userName = full_name || "utilisateur";

    const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const systemPrompt = `Tu es un conseiller stratégique en communication politique spécialisé en République Démocratique du Congo (RDC).
Tu fournis des recommandations personnalisées, concrètes et actionnables pour le tableau de bord quotidien d'un acteur politique.
Tes recommandations tiennent compte du rôle politique, de la région d'ancrage, et du contexte politique actuel en RDC.
Date du jour : ${today}.`;

    const userPrompt = `Profil de l'utilisateur :
- Nom : ${userName}
- Rôle politique : ${roleName}
- Région : ${regionName}

Génère les données personnalisées suivantes pour son tableau de bord :

1. **Indice de tension politique** dans sa région (0-100) avec une courte explication
2. **Score d'image publique** estimé (0-100) avec tendance et explication
3. **3 recommandations prioritaires** adaptées à son rôle et sa région, classées par urgence (high/medium/low)
4. **4 événements politiques à venir** pertinents pour sa région et son rôle (avec dates réalistes à partir d'aujourd'hui)

Sois concret, ancré dans la réalité politique congolaise actuelle.`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "return_dashboard_data",
              description: "Return personalized dashboard data for a political actor in DRC",
              parameters: {
                type: "object",
                properties: {
                  tension: {
                    type: "object",
                    properties: {
                      score: { type: "number", description: "Tension index 0-100" },
                      label: { type: "string", description: "Short label like 'Élevé', 'Modéré', 'Faible'" },
                      explanation: { type: "string", description: "One-line explanation of the tension level" },
                      trend: { type: "string", enum: ["up", "down", "stable"], description: "Trend direction" },
                    },
                    required: ["score", "label", "explanation", "trend"],
                    additionalProperties: false,
                  },
                  image_score: {
                    type: "object",
                    properties: {
                      score: { type: "number", description: "Public image score 0-100" },
                      change: { type: "number", description: "Points change this week, e.g. -5 or +3" },
                      explanation: { type: "string", description: "One-line explanation" },
                    },
                    required: ["score", "change", "explanation"],
                    additionalProperties: false,
                  },
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Short recommendation title" },
                        description: { type: "string", description: "One-sentence actionable description" },
                        urgency: { type: "string", enum: ["high", "medium", "low"] },
                      },
                      required: ["title", "description", "urgency"],
                      additionalProperties: false,
                    },
                  },
                  events: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string", description: "Date like '22 Mars'" },
                        title: { type: "string", description: "Event title" },
                      },
                      required: ["date", "title"],
                      additionalProperties: false,
                    },
                  },
                  greeting: { type: "string", description: "Short personalized greeting for the user, 1 sentence" },
                },
                required: ["tension", "image_score", "recommendations", "events", "greeting"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_dashboard_data" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    let result;
    if (toolCall) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      const content = data.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    }

    if (!result) throw new Error("No valid response from AI");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dashboard-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
