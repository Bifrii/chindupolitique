import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROVINCES = [
  "Kinshasa", "Nord-Kivu", "Sud-Kivu", "Haut-Katanga", "Lualaba",
  "Kasaï", "Kasaï-Central", "Kasaï-Oriental", "Équateur", "Mongala",
  "Tshuapa", "Kongo-Central", "Tshopo", "Ituri", "Haut-Uélé",
  "Bas-Uélé", "Maniema", "Tanganyika", "Haut-Lomami", "Lomami",
  "Sankuru", "Mai-Ndombe", "Kwilu", "Kwango", "Nord-Ubangi", "Sud-Ubangi",
];

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Tu es un analyste politique spécialisé en RDC. Tu évalues le niveau de tension politique dans chaque province de la RDC sur une échelle de 0 à 100. Date : ${today}. Base tes évaluations sur le contexte réel : conflits armés, tensions ethniques, manifestations, élections, crises humanitaires, etc.`,
          },
          {
            role: "user",
            content: `Évalue le niveau de tension politique pour chacune des 26 provinces de la RDC : ${PROVINCES.join(", ")}.

Pour chaque province, fournis :
- Le score de tension (0-100)
- Une courte explication (max 80 caractères)
- Les acteurs clés impliqués dans cette province (max 3)
- Les sujets sensibles actuels (max 3)
- Une opportunité de prise de parole pour un acteur politique`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_radar_data",
              description: "Return political radar data for all 26 DRC provinces",
              parameters: {
                type: "object",
                properties: {
                  provinces: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        tension: { type: "number", description: "0-100" },
                        explanation: { type: "string", description: "Short explanation, max 80 chars" },
                        actors: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              role: { type: "string" },
                              position: { type: "string" },
                            },
                            required: ["name", "role", "position"],
                            additionalProperties: false,
                          },
                        },
                        hot_topics: { type: "array", items: { type: "string" } },
                        opportunity: { type: "string" },
                      },
                      required: ["name", "tension", "explanation", "actors", "hot_topics", "opportunity"],
                      additionalProperties: false,
                    },
                  },
                  global_summary: { type: "string", description: "One paragraph summary of the overall political situation in DRC" },
                },
                required: ["provinces", "global_summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_radar_data" } },
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
    console.error("political-radar error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
