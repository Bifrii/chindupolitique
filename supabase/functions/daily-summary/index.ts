import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date().toISOString().split("T")[0];

    // Count events by type for today
    const { data: events } = await supabase
      .from("operational_events")
      .select("*")
      .gte("created_at", `${today}T00:00:00Z`)
      .lt("created_at", `${today}T23:59:59Z`);

    const allEvents = events ?? [];

    const visits = allEvents.filter((e: any) => e.event_type === "visit_tracked").length;
    const signups = allEvents.filter((e: any) => e.event_type === "signup_success").length;
    const conversionRate = visits > 0 ? Math.round((signups / visits) * 10000) / 100 : 0;
    const activeUsers = new Set(allEvents.filter((e: any) => e.user_id).map((e: any) => e.user_id)).size;

    const technicalErrors = allEvents.filter((e: any) =>
      ["login_failed", "signup_failed", "page_error", "api_error", "slow_response"].includes(e.event_type)
    );

    const growthEvents = allEvents.filter((e: any) => e.event_category === "growth");
    const feedbackEvents = allEvents.filter((e: any) => e.event_category === "feedback");

    // Upsert daily_metrics
    await supabase.from("daily_metrics").upsert({
      date: today,
      visits,
      signups,
      conversion_rate: conversionRate,
      active_users: activeUsers,
      notes: `Auto-generated. ${technicalErrors.length} technical errors, ${feedbackEvents.length} feedbacks.`,
    }, { onConflict: "date" });

    // Create incidents from critical errors
    const criticalErrors = technicalErrors.filter((e: any) =>
      ["page_error", "api_error"].includes(e.event_type)
    );
    for (const err of criticalErrors.slice(0, 10)) {
      await supabase.from("daily_incidents").insert({
        date: today,
        incident_type: err.event_type,
        severity: err.event_type === "page_error" ? "high" : "medium",
        page_or_module: err.page_or_module,
        message: JSON.stringify(err.metadata),
      });
    }

    // Get today's incidents
    const { data: incidents } = await supabase
      .from("daily_incidents")
      .select("*")
      .eq("date", today)
      .order("created_at", { ascending: false })
      .limit(10);

    // Get today's feedback
    const { data: feedback } = await supabase
      .from("daily_feedback")
      .select("*")
      .eq("date", today)
      .order("created_at", { ascending: false })
      .limit(10);

    const criticalIncidents = (incidents ?? []).filter((i: any) =>
      ["high", "critical"].includes(i.severity)
    );

    const technicalStatus = criticalIncidents.length > 3
      ? "degraded"
      : criticalIncidents.length > 0
        ? "warning"
        : "ok";

    const growthStatus = signups > 5
      ? "growing"
      : signups > 0
        ? "stable"
        : "stagnant";

    const mainRisks: string[] = [];
    if (criticalIncidents.length > 0) mainRisks.push(`${criticalIncidents.length} incident(s) critique(s)`);
    if (technicalErrors.length > 10) mainRisks.push("Volume élevé d'erreurs techniques");

    const mainOpportunities: string[] = [];
    if (signups > 0) mainOpportunities.push(`${signups} nouvelle(s) inscription(s)`);
    const featureUsage = allEvents.filter((e: any) => e.event_type === "feature_used");
    if (featureUsage.length > 0) mainOpportunities.push(`${featureUsage.length} utilisations de fonctionnalités`);

    const recommendedActions: string[] = [];
    if (technicalStatus !== "ok") recommendedActions.push("Investiguer les incidents critiques");
    if (conversionRate < 5 && visits > 10) recommendedActions.push("Optimiser le tunnel de conversion");
    if (feedbackEvents.length > 0) recommendedActions.push("Traiter les retours utilisateurs prioritaires");

    // Upsert daily summary
    await supabase.from("daily_operations_summary").upsert({
      date: today,
      technical_status: technicalStatus,
      growth_status: growthStatus,
      key_incidents: criticalIncidents.slice(0, 5),
      top_feedback: (feedback ?? []).slice(0, 5),
      main_risks: mainRisks,
      main_opportunities: mainOpportunities,
      recommended_actions: recommendedActions,
      total_visits: visits,
      total_signups: signups,
      conversion_rate: conversionRate,
    }, { onConflict: "date" });

    return new Response(JSON.stringify({
      success: true,
      date: today,
      technical_status: technicalStatus,
      growth_status: growthStatus,
      visits,
      signups,
      incidents: criticalIncidents.length,
      feedback_count: (feedback ?? []).length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
