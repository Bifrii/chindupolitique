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
    const _authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await _authClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all users with profiles that have a region set
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, political_role, region")
      .not("region", "is", null);

    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No profiles with regions found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group users by region
    const regionUsers: Record<string, typeof profiles> = {};
    for (const p of profiles) {
      if (!p.region) continue;
      if (!regionUsers[p.region]) regionUsers[p.region] = [];
      regionUsers[p.region].push(p);
    }

    const regions = Object.keys(regionUsers);
    const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    // Generate alerts for each region via AI
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
            content: `Tu es un système d'alerte politique pour la RDC. Tu génères des notifications courtes et percutantes sur les tendances et crises politiques. Date : ${today}.`,
          },
          {
            role: "user",
            content: `Génère des alertes politiques pour ces régions de la RDC : ${regions.join(", ")}.
Pour chaque région, génère 1 à 2 alertes pertinentes (tendances, crises, opportunités).
Chaque alerte doit avoir un type : "crisis" (rouge, urgent), "trend" (bleu, tendance), ou "opportunity" (vert, opportunité).`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_alerts",
              description: "Return political alerts per region",
              parameters: {
                type: "object",
                properties: {
                  alerts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        region: { type: "string" },
                        title: { type: "string", description: "Short alert title, max 60 chars" },
                        message: { type: "string", description: "Alert details, max 150 chars" },
                        type: { type: "string", enum: ["crisis", "trend", "opportunity"] },
                      },
                      required: ["region", "title", "message", "type"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["alerts"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_alerts" } },
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
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { alerts: [] };
    }

    // Insert notifications for each user based on their region
    const notifications: any[] = [];
    for (const alert of result.alerts) {
      const users = regionUsers[alert.region] || [];
      for (const user of users) {
        notifications.push({
          user_id: user.id,
          title: alert.title,
          message: alert.message,
          type: alert.type,
          region: alert.region,
        });
      }
    }

    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);
      if (insertError) throw insertError;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      alerts_generated: result.alerts.length,
      notifications_sent: notifications.length 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-notifications error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
