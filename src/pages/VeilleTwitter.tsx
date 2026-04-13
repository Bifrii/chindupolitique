import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Copy, Save, Loader2,
  Trash2, Filter, AlertTriangle, MapPin, Hash, ExternalLink,
  TrendingUp, Clock, Circle, Shield, MessageSquare, Scale, Megaphone, Heart, Newspaper
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Trend {
  rank: number;
  titre: string;
  resume: string;
  categorie: string;
  intensite: string;
  sources: string[];
  hashtags_associes: string[];
  sentiment_dominant: string;
  region_concernee: string;
}

interface VeilleData {
  trends: Trend[];
  analyse_globale: string;
  niveau_tension_national: number;
  timestamp: string;
}

interface Reply {
  text: string;
  tone: string;
  hashtags: string[];
  score_engagement?: number;
}

interface SavedReply {
  id: string;
  trend_title: string;
  position: string;
  post_text: string;
  tone: string;
  hashtags: string[];
  created_at: string;
}

const categoryColors: Record<string, string> = {
  Politique: "bg-primary/15 text-primary border-primary/20",
  Sécurité: "bg-destructive/15 text-destructive border-destructive/20",
  Économie: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  Social: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  International: "bg-purple-500/15 text-purple-400 border-purple-500/20",
};

const intensiteColors: Record<string, string> = {
  Faible: "bg-muted/50 text-muted-foreground border-border/30",
  Moyenne: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  Élevée: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  Critique: "bg-red-600/15 text-red-400 border-red-600/20",
};

const sentimentColors: Record<string, string> = {
  Positif: "bg-emerald-500/15 text-emerald-400",
  Négatif: "bg-destructive/15 text-destructive",
  Mitigé: "bg-amber-500/15 text-amber-400",
};

const toneColors: Record<string, string> = {
  Ferme: "bg-destructive/15 text-destructive border-destructive/20",
  Ironique: "bg-muted/50 text-foreground/70 border-border/30",
  Rassembleur: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  Provocateur: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  Diplomatique: "bg-primary/15 text-primary border-primary/20",
};

const AUTO_REFRESH_INTERVAL = 30 * 60 * 1000;
const COOLDOWN_SECONDS = 60;

export default function VeilleTwitter() {
  const [veilleData, setVeilleData] = useState<VeilleData | null>(null);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [replies, setReplies] = useState<Record<number, Reply[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<Record<number, boolean>>({});
  const [positions, setPositions] = useState<Record<number, string>>({});
  const [openTrends, setOpenTrends] = useState<Record<number, boolean>>({});
  const [savedReplies, setSavedReplies] = useState<SavedReply[]>([]);
  const [filterPosition, setFilterPosition] = useState<string>("all");
  const [tensionHistory, setTensionHistory] = useState<{ date: string; niveau: number; label: string }[]>([]);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [autoRefreshActive] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [tensionAlert, setTensionAlert] = useState<string | null>(null);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);
  const prevTensionRef = useRef<number | null>(null);
  const { toast } = useToast();
  const { user, profile } = useAuth();

  useEffect(() => {
    loadCachedData();
    loadTensionHistory();
    fetchSavedReplies();
  }, [user]);

  useEffect(() => {
    if (autoRefreshActive) {
      autoRefreshRef.current = setInterval(() => {
        fetchTrends(true);
      }, AUTO_REFRESH_INTERVAL);
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [autoRefreshActive]);

  useEffect(() => {
    if (cooldown > 0) {
      cooldownRef.current = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => { if (cooldownRef.current) clearTimeout(cooldownRef.current); };
    }
  }, [cooldown]);

  const loadCachedData = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("veille_cache").select("*").eq("user_id", user.id)
      .order("fetched_at", { ascending: false }).limit(1);
    if (data?.[0]) {
      const cached = data[0];
      setVeilleData({
        trends: cached.trends_data as unknown as Trend[],
        analyse_globale: cached.analyse_globale || "",
        niveau_tension_national: cached.tension_level || 0,
        timestamp: cached.fetched_at,
      });
      setLastFetchTime(new Date(cached.fetched_at));
      prevTensionRef.current = cached.tension_level || 0;
    }
  };

  const loadTensionHistory = async () => {
    if (!user) return;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data } = await (supabase as any)
      .from("veille_cache").select("tension_level, fetched_at").eq("user_id", user.id)
      .gte("fetched_at", sevenDaysAgo.toISOString()).order("fetched_at", { ascending: true });
    if (data) {
      setTensionHistory(
        data.map((d: any) => ({
          date: new Date(d.fetched_at).toISOString(),
          niveau: d.tension_level || 0,
          label: new Date(d.fetched_at).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
        }))
      );
    }
  };

  const saveCacheData = async (data: VeilleData) => {
    if (!user) return;
    await (supabase as any).from("veille_cache").insert({
      user_id: user.id, trends_data: data.trends, analyse_globale: data.analyse_globale,
      tension_level: data.niveau_tension_national, fetched_at: new Date().toISOString(),
    });
    await loadTensionHistory();
  };

  const checkAlerts = async (data: VeilleData) => {
    if (!user) return;
    if (prevTensionRef.current !== null) {
      const diff = data.niveau_tension_national - prevTensionRef.current;
      if (diff >= 20) {
        const msg = `Forte hausse des tensions politiques détectée (+${diff} points)`;
        setTensionAlert(msg);
        await (supabase as any).from("veille_alertes").insert({ user_id: user.id, message: msg, severity: "critical", trend_title: null });
        toast({ title: "Alerte tensions", description: msg, variant: "destructive" });
      }
    }
    const criticalTrends = data.trends.filter(t => t.intensite === "Critique");
    for (const t of criticalTrends) {
      toast({ title: "Sujet critique détecté", description: t.titre, variant: "destructive" });
      await (supabase as any).from("veille_alertes").insert({ user_id: user.id, message: `Nouveau sujet critique: ${t.titre}`, severity: "critical", trend_title: t.titre });
    }
    prevTensionRef.current = data.niveau_tension_national;
  };

  const fetchSavedReplies = useCallback(async () => {
    const { data } = await (supabase as any).from("veille_repliques").select("*").order("created_at", { ascending: false });
    if (data) setSavedReplies(data as SavedReply[]);
  }, []);

  const fetchTrends = async (isAuto = false) => {
    if (!isAuto && cooldown > 0) return;
    setLoadingTrends(true);
    setFetchError(null);
    if (!isAuto) setCooldown(COOLDOWN_SECONDS);
    try {
      const { data, error } = await supabase.functions.invoke("veille-trends");
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      const result: VeilleData = {
        trends: data.trends || [], analyse_globale: data.analyse_globale || "",
        niveau_tension_national: data.niveau_tension_national || 0, timestamp: data.timestamp || new Date().toISOString(),
      };
      setVeilleData(result);
      setLastFetchTime(new Date());
      await saveCacheData(result);
      await checkAlerts(result);
    } catch (e: any) {
      const errMsg = e?.message || "Impossible de charger les tendances.";
      setFetchError(errMsg);
      toast({ title: "Erreur", description: errMsg, variant: "destructive" });
    } finally {
      setLoadingTrends(false);
    }
  };

  const fetchReplies = async (rank: number, trend: Trend, position: string) => {
    if (!trend?.titre) { toast({ title: "Erreur", description: "Données de tendance manquantes.", variant: "destructive" }); return; }
    setLoadingReplies(prev => ({ ...prev, [rank]: true }));
    setPositions(prev => ({ ...prev, [rank]: position }));
    try {
      const { data, error } = await supabase.functions.invoke("veille-replies", {
        body: { trendTitle: trend.titre, trendResume: trend.resume, trendIntensite: trend.intensite, trendSentiment: trend.sentiment_dominant, trendHashtags: trend.hashtags_associes, position, userRole: profile?.political_role, userRegion: profile?.region },
      });
      if (error) throw error;
      setReplies(prev => ({ ...prev, [rank]: data.replies || [] }));
    } catch { toast({ title: "Erreur", description: "Impossible de générer les répliques.", variant: "destructive" }); }
    finally { setLoadingReplies(prev => ({ ...prev, [rank]: false })); }
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); toast({ title: "Copié !" }); };

  const saveReply = async (trendTitle: string, position: string, reply: Reply) => {
    if (!user) { toast({ title: "Erreur", description: "Connectez-vous pour sauvegarder.", variant: "destructive" }); return; }
    const { error } = await (supabase as any).from("veille_repliques").insert({ trend_title: trendTitle, position, post_text: reply.text, tone: reply.tone, hashtags: reply.hashtags, user_id: user.id });
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Sauvegardé !" }); fetchSavedReplies(); }
  };

  const deleteReply = async (id: string) => { await (supabase as any).from("veille_repliques").delete().eq("id", id); fetchSavedReplies(); };

  const formatTime = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const tensionColor = (level: number) => {
    if (level >= 75) return "text-red-400";
    if (level >= 50) return "text-orange-400";
    if (level >= 25) return "text-amber-400";
    return "text-emerald-400";
  };

  const tensionProgressColor = (level: number) => {
    if (level >= 75) return "[&>div]:bg-red-500";
    if (level >= 50) return "[&>div]:bg-orange-500";
    if (level >= 25) return "[&>div]:bg-amber-500";
    return "[&>div]:bg-emerald-500";
  };

  const postureLabels: Record<string, string> = {
    supportive: "Soutien", critical: "Critique", neutral: "Neutre",
    official: "Officiel", calm: "Appel au calme", pour: "Pour", contre: "Contre",
  };
  const postureColors: Record<string, string> = {
    supportive: "border-emerald-500/20 text-emerald-400",
    critical: "border-destructive/20 text-destructive",
    neutral: "border-amber-500/20 text-amber-400",
    official: "border-primary/20 text-primary",
    calm: "border-purple-500/20 text-purple-400",
    pour: "border-emerald-500/20 text-emerald-400",
    contre: "border-destructive/20 text-destructive",
  };

  const filteredSaved = savedReplies.filter(r => filterPosition === "all" || r.position === filterPosition);

  return (
    <div className="max-w-3xl mx-auto space-y-10 md:space-y-14 py-4 md:py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">Veille & Répliques</h1>
          {autoRefreshActive && (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1.5 text-[10px]">
              <Circle className="h-1.5 w-1.5 fill-emerald-400" />
              En direct
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm max-w-lg leading-relaxed">
          Suivez les tendances politiques en RDC et générez des répliques stratégiques.
        </p>
        <div className="system-line mt-6" />
      </motion.div>

      {/* Alerts */}
      <AnimatePresence>
        {tensionAlert && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <div className="border border-red-600/20 rounded-xl p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-red-400 uppercase tracking-wider">Alerte tensions</p>
                  <p className="text-sm text-muted-foreground mt-1">{tensionAlert}</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setTensionAlert(null)} className="text-xs text-muted-foreground shrink-0">Fermer</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {fetchError && veilleData && (
        <div className="border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">Données en cache</p>
            <p className="text-sm text-muted-foreground mt-1">
              Données du {lastFetchTime ? formatTime(lastFetchTime) : "?"} — Actualisation échouée: {fetchError}
            </p>
          </div>
        </div>
      )}

      {/* Refresh */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Button
          onClick={() => fetchTrends(false)}
          disabled={loadingTrends || cooldown > 0}
          variant="ghost"
          className="font-medium w-full sm:w-auto h-11 px-6 rounded-xl bg-foreground/10 hover:bg-foreground/15 text-foreground border border-border/30"
        >
          {loadingTrends ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2 text-muted-foreground" /> Analyse…</>
          ) : cooldown > 0 ? (
            <><Clock className="h-4 w-4 mr-2 text-muted-foreground" /> Disponible dans {cooldown}s</>
          ) : (
            <><RefreshCw className="h-4 w-4 mr-2 text-muted-foreground" /> Actualiser</>
          )}
        </Button>
        {lastFetchTime && (
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3 w-3" /> Mis à jour à {formatTime(lastFetchTime)}
          </span>
        )}
      </motion.div>

      {/* Loading Skeletons */}
      {loadingTrends && !veilleData && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="border border-border/20 rounded-xl p-5 animate-pulse space-y-3">
              <div className="flex items-start gap-4">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <div className="flex gap-2"><Skeleton className="h-5 w-16 rounded-full" /><Skeleton className="h-5 w-14 rounded-full" /></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loadingTrends && (!veilleData || !veilleData.trends || veilleData.trends.length === 0) && !fetchError && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="border border-border/20 rounded-xl p-10 text-center space-y-3">
          <Newspaper className="h-8 w-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">Aucune tendance disponible.</p>
          <p className="text-xs text-muted-foreground/60">Cliquez sur « Actualiser » pour charger les dernières actualités des médias congolais.</p>
        </motion.div>
      )}

      {!loadingTrends && fetchError && !veilleData && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="border border-destructive/20 rounded-xl p-10 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-destructive/40 mx-auto" />
          <p className="text-sm text-destructive/80">Impossible de charger les actualités</p>
          <p className="text-xs text-muted-foreground">{fetchError}</p>
        </motion.div>
      )}

      {/* Trend Cards */}
      {veilleData && veilleData.trends && veilleData.trends.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence>
            {veilleData.trends.map((trend) => trend && (
              <motion.div
                key={trend.rank}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: loadingTrends ? 0.5 : 1, y: 0 }}
                transition={{ delay: trend.rank * 0.06, duration: 0.4 }}
              >
                <Collapsible
                  open={openTrends[trend.rank]}
                  onOpenChange={open => setOpenTrends(prev => ({ ...prev, [trend.rank]: open }))}
                >
                  <div className={`border rounded-xl overflow-hidden transition-all hover:border-border/40 ${
                    trend.intensite === "Critique" ? "border-red-600/20" : "border-border/20"
                  }`}>
                    <CollapsibleTrigger asChild>
                      <div className="cursor-pointer p-5 hover:bg-muted/10 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/30 shrink-0">
                            <span className="text-xs font-mono text-muted-foreground">{String(trend.rank).padStart(2, '0')}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-foreground leading-snug">{trend?.titre ?? "Titre non disponible"}</h3>
                            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{trend?.resume ?? ""}</p>
                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                              <Badge className={`text-[10px] font-normal ${categoryColors[trend?.categorie ?? ""] || "bg-muted/50 text-muted-foreground border-border/30"}`} variant="outline">
                                {trend?.categorie ?? "Politique"}
                              </Badge>
                              <Badge className={`text-[10px] font-normal ${intensiteColors[trend?.intensite ?? ""] || "bg-muted/50"}`} variant="outline">
                                {trend?.intensite ?? "Moyenne"}
                              </Badge>
                              <Badge className={`text-[10px] font-normal border-0 ${sentimentColors[trend?.sentiment_dominant ?? ""] || "bg-muted/50"}`} variant="outline">
                                {trend?.sentiment_dominant ?? "Mitigé"}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-2.5 w-2.5" />
                                {trend?.region_concernee ?? "Nationale"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-5 pb-5 pt-0 space-y-5 border-t border-border/10">
                        {/* Sources */}
                        {trend.sources?.length > 0 && (
                          <div className="space-y-2 pt-4">
                            <p className="system-text tracking-widest">Sources</p>
                            <div className="flex flex-wrap gap-2">
                              {trend.sources.map((s, i) => (
                                <Badge key={i} variant="outline" className="text-[10px] gap-1 border-border/20 text-muted-foreground font-normal hover:border-border/40 transition-colors cursor-pointer">
                                  <ExternalLink className="h-2.5 w-2.5" />{s}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Hashtags */}
                        {trend.hashtags_associes?.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {trend.hashtags_associes.map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] text-primary/70 border-primary/15 gap-1 font-normal">
                                <Hash className="h-2.5 w-2.5" />{tag.replace(/^#/, "")}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Posture Buttons */}
                        <div className="space-y-2">
                          <p className="system-text tracking-widest text-[9px]">Choisir une posture</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {[
                              { key: "supportive", label: "Soutien", icon: Heart, activeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
                              { key: "critical", label: "Critique", icon: MessageSquare, activeClass: "bg-destructive/15 text-destructive border-destructive/30" },
                              { key: "neutral", label: "Neutre", icon: Scale, activeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
                              { key: "official", label: "Officiel", icon: Shield, activeClass: "bg-primary/15 text-primary border-primary/30" },
                              { key: "calm", label: "Appel au calme", icon: Megaphone, activeClass: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
                            ].map(({ key, label, icon: Icon, activeClass }) => (
                              <Button
                                key={key}
                                variant="ghost"
                                className={`h-10 rounded-xl text-xs font-medium transition-all ${
                                  positions[trend.rank] === key
                                    ? activeClass
                                    : "border border-border/20 text-muted-foreground hover:border-border/40 hover:text-foreground"
                                }`}
                                onClick={() => fetchReplies(trend.rank, trend, key)}
                                disabled={loadingReplies[trend.rank]}
                              >
                                <Icon className="h-3.5 w-3.5 mr-1.5" /> {label}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Loading Replies */}
                        {loadingReplies[trend.rank] && (
                          <div className="flex items-center gap-3 py-8 justify-center text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-xs">Génération des répliques…</span>
                          </div>
                        )}

                        {/* Replies */}
                        {replies[trend.rank] && !loadingReplies[trend.rank] && (
                          <div className="space-y-3">
                            {replies[trend.rank].map((reply, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05, duration: 0.3 }}
                                className="border border-border/15 rounded-xl p-4 space-y-3 hover:border-border/30 transition-colors"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <Badge className={`text-[10px] font-normal ${toneColors[reply.tone] || "bg-muted/50 border-border/30"}`} variant="outline">
                                      {reply.tone}
                                    </Badge>
                                    {reply.score_engagement !== undefined && (
                                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <TrendingUp className="h-2.5 w-2.5" /> {reply.score_engagement}%
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground font-mono">{reply.text.length}/280</span>
                                </div>
                                <p className="text-sm text-foreground/80 leading-relaxed">{reply.text}</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {reply.hashtags.map((tag, j) => (
                                    <span key={j} className="text-[10px] text-primary/60">{tag.startsWith("#") ? tag : `#${tag}`}</span>
                                  ))}
                                </div>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(reply.text + " " + reply.hashtags.map(t => t.startsWith("#") ? t : `#${t}`).join(" "))} className="h-7 text-[10px] text-muted-foreground hover:text-foreground px-2">
                                    <Copy className="h-3 w-3 mr-1" /> Copier
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => saveReply(trend.titre, positions[trend.rank], reply)} className="h-7 text-[10px] text-muted-foreground hover:text-foreground px-2">
                                    <Save className="h-3 w-3 mr-1" /> Sauvegarder
                                  </Button>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Analyse & Tension */}
      {veilleData && (
        <div className="grid gap-4 md:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
            className="border border-border/20 rounded-xl p-5 md:p-6 hover:border-border/30 transition-colors">
            <p className="system-text tracking-widest mb-4">Analyse globale</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{veilleData.analyse_globale}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }}
            className="border border-border/20 rounded-xl p-5 md:p-6 hover:border-border/30 transition-colors">
            <p className="system-text tracking-widest mb-4">Tension nationale</p>
            <div className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-semibold tracking-tight ${tensionColor(veilleData.niveau_tension_national)}`}>
                  {veilleData.niveau_tension_national}
                </span>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
              <Progress value={veilleData.niveau_tension_national} className={`h-1 bg-muted/20 ${tensionProgressColor(veilleData.niveau_tension_national)}`} />
              <p className="text-xs text-muted-foreground">
                {veilleData.niveau_tension_national >= 75 ? "Tensions critiques"
                  : veilleData.niveau_tension_national >= 50 ? "Tensions élevées"
                  : veilleData.niveau_tension_national >= 25 ? "Tensions modérées"
                  : "Situation calme"}
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Chart */}
      {tensionHistory.length >= 2 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}
          className="border border-border/20 rounded-xl p-5 md:p-6 hover:border-border/30 transition-colors">
          <div className="flex items-center justify-between mb-5">
            <p className="system-text tracking-widest">Évolution — 7 jours</p>
            <span className="text-[10px] text-muted-foreground font-mono">{tensionHistory.length} relevés</span>
          </div>
          <div className="h-[200px] md:h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tensionHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="tensionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.15} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))", opacity: 0.3 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))", opacity: 0.3 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border) / 0.3)", borderRadius: "10px", fontSize: "12px", boxShadow: "none" }}
                  labelStyle={{ color: "hsl(var(--foreground))", fontSize: "11px" }}
                  formatter={(value: number) => [`${value}/100`, "Tension"]}
                />
                <ReferenceLine y={75} stroke="hsl(0, 60%, 45%)" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: "Critique", position: "right", fill: "hsl(0, 60%, 45%)", fontSize: 10 }} />
                <ReferenceLine y={50} stroke="hsl(30, 60%, 45%)" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: "Élevé", position: "right", fill: "hsl(30, 60%, 45%)", fontSize: 10 }} />
                <Area type="monotone" dataKey="niveau" stroke="hsl(var(--primary))" strokeWidth={1.5} fill="url(#tensionGradient)" dot={{ r: 3, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Saved Replies */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.5 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <p className="system-text tracking-widest">Archives des répliques</p>
          </div>
          <Select value={filterPosition} onValueChange={setFilterPosition}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 bg-muted/30 border-border/20 text-xs rounded-xl">
              <Filter className="h-3 w-3 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border/30">
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="supportive">Soutien</SelectItem>
              <SelectItem value="critical">Critique</SelectItem>
              <SelectItem value="neutral">Neutre</SelectItem>
              <SelectItem value="official">Officiel</SelectItem>
              <SelectItem value="calm">Appel au calme</SelectItem>
              <SelectItem value="pour">Pour (ancien)</SelectItem>
              <SelectItem value="contre">Contre (ancien)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredSaved.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-12">
            Aucune réplique sauvegardée.
          </p>
        ) : (
          <div className="space-y-3">
            {filteredSaved.map(item => (
              <div key={item.id} className="border border-border/20 rounded-xl p-4 space-y-3 hover:border-border/30 transition-colors">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] font-normal ${postureColors[item.position] || "border-border/20 text-muted-foreground"}`}>
                    {postureLabels[item.position] || item.position}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] font-normal ${toneColors[item.tone] || "bg-muted/50 border-border/30"}`}>
                    {item.tone}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                    {new Date(item.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.trend_title}</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{item.post_text}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {item.hashtags?.map((tag, j) => (
                    <span key={j} className="text-[10px] text-primary/60">{tag.startsWith("#") ? tag : `#${tag}`}</span>
                  ))}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(item.post_text)} className="h-7 text-[10px] text-muted-foreground hover:text-foreground px-2">
                    <Copy className="h-3 w-3 mr-1" /> Copier
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive/60 hover:text-destructive px-2" onClick={() => deleteReply(item.id)}>
                    <Trash2 className="h-3 w-3 mr-1" /> Supprimer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
