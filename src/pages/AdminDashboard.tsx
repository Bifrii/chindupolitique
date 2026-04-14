import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Activity, AlertTriangle, MessageSquare, TrendingUp, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface DailySummary {
  date: string;
  technical_status: string;
  growth_status: string;
  key_incidents: any[];
  top_feedback: any[];
  main_risks: string[];
  main_opportunities: string[];
  recommended_actions: string[];
  total_visits: number;
  total_signups: number;
  conversion_rate: number;
}

interface Incident {
  id: string;
  incident_type: string;
  severity: string;
  page_or_module: string;
  message: string;
  resolved: boolean;
  created_at: string;
}

interface Feedback {
  id: string;
  category: string;
  message: string;
  priority: string;
  created_at: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAdminRole();
  }, [user]);

  const checkAdminRole = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
    if (data) loadData();
    setLoading(false);
  };

  const loadData = async () => {
    const today = new Date().toISOString().split("T")[0];

    const [summaryRes, incidentsRes, feedbackRes] = await Promise.all([
      (supabase as any).from("daily_operations_summary").select("*").eq("date", today).maybeSingle(),
      (supabase as any).from("daily_incidents").select("*").eq("date", today).order("created_at", { ascending: false }).limit(20),
      (supabase as any).from("daily_feedback").select("*").eq("date", today).order("created_at", { ascending: false }).limit(20),
    ]);

    if (summaryRes.data) setSummary(summaryRes.data);
    if (incidentsRes.data) setIncidents(incidentsRes.data);
    if (feedbackRes.data) setFeedback(feedbackRes.data);
  };

  const triggerDailySummary = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("daily-summary");
      if (error) throw error;
      toast.success("Résumé journalier généré avec succès");
      await loadData();
    } catch (e: any) {
      toast.error("Erreur: " + e.message);
    }
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-2 border-muted-foreground/30 border-t-foreground/60 rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-xl font-semibold text-foreground/80">Accès restreint</h2>
        <p className="text-muted-foreground text-sm">Cette page est réservée aux administrateurs.</p>
      </div>
    );
  }

  const statusColor = (status: string) => {
    if (status === "ok" || status === "growing") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (status === "warning" || status === "stable") return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  const severityColor = (sev: string) => {
    if (sev === "critical") return "destructive";
    if (sev === "high") return "destructive";
    if (sev === "medium") return "secondary";
    return "outline";
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">Supervision Opérationnelle</h1>
            <p className="text-xs text-muted-foreground">
              {summary?.date ? `Données du ${new Date(summary.date).toLocaleDateString('fr-FR')}` : "Aucune donnée aujourd'hui"}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={triggerDailySummary}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Générer le résumé
        </Button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Statut Technique</span>
            </div>
            <Badge className={statusColor(summary?.technical_status ?? "ok")}>
              {summary?.technical_status ?? "—"}
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Croissance</span>
            </div>
            <Badge className={statusColor(summary?.growth_status ?? "stable")}>
              {summary?.growth_status ?? "—"}
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-border/30">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Visites</div>
            <div className="text-2xl font-semibold text-foreground">{summary?.total_visits ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="border-border/30">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Inscriptions</div>
            <div className="text-2xl font-semibold text-foreground">
              {summary?.total_signups ?? 0}
              <span className="text-xs text-muted-foreground ml-2">
                ({summary?.conversion_rate ?? 0}%)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Incidents */}
        <Card className="border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Incidents du jour ({incidents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-80 overflow-y-auto">
            {incidents.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Aucun incident</p>
            ) : (
              incidents.map((inc) => (
                <div key={inc.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                  {inc.resolved ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={severityColor(inc.severity) as any} className="text-[10px]">
                        {inc.severity}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{inc.incident_type}</span>
                    </div>
                    <p className="text-xs text-foreground/70 mt-1 truncate">{inc.message}</p>
                    {inc.page_or_module && (
                      <span className="text-[10px] text-muted-foreground">{inc.page_or_module}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Feedback */}
        <Card className="border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Retours utilisateurs ({feedback.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-80 overflow-y-auto">
            {feedback.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Aucun retour</p>
            ) : (
              feedback.map((fb) => (
                <div key={fb.id} className="p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px]">{fb.category}</Badge>
                    <Badge variant={fb.priority === "urgent" || fb.priority === "high" ? "destructive" : "secondary"} className="text-[10px]">
                      {fb.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-foreground/70">{fb.message}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Risks, Opportunities, Actions */}
      {summary && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-border/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-400">Risques</CardTitle>
            </CardHeader>
            <CardContent>
              {(summary.main_risks ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun risque identifié</p>
              ) : (
                <ul className="space-y-1">
                  {summary.main_risks.map((r, i) => (
                    <li key={i} className="text-xs text-foreground/70">• {r}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-400">Opportunités</CardTitle>
            </CardHeader>
            <CardContent>
              {(summary.main_opportunities ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucune opportunité détectée</p>
              ) : (
                <ul className="space-y-1">
                  {summary.main_opportunities.map((o, i) => (
                    <li key={i} className="text-xs text-foreground/70">• {o}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-primary">Actions recommandées</CardTitle>
            </CardHeader>
            <CardContent>
              {(summary.recommended_actions ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucune action requise</p>
              ) : (
                <ul className="space-y-1">
                  {summary.recommended_actions.map((a, i) => (
                    <li key={i} className="text-xs text-foreground/70">• {a}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
