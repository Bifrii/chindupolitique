import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Flame, Star, Swords, Megaphone, TrendingUp, TrendingDown,
  Minus, Calendar, Lightbulb, ChevronRight, Loader2, RefreshCw,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { trackFeatureUsed, trackVisit } from "@/lib/operationalTracking";

interface DashboardData {
  tension: { score: number; label: string; explanation: string; trend: string };
  image_score: { score: number; change: number; explanation: string };
  recommendations: { title: string; description: string; urgency: string }[];
  events: { date: string; title: string }[];
  greeting: string;
}

function HeroLanding() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const params = new URLSearchParams();
    params.set("q", query.trim());
    navigate(`/stratege?${params.toString()}`);
  };

  return (
    <div className="hero-landing">
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        className="hero-headline"
      >
        Contrôlez le récit.
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
        className="hero-subtext"
      >
        Décrivez une situation. Le système génère une réponse stratégique.
      </motion.p>
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="hero-input-wrapper"
      >
        <div className={`hero-input-ring ${focused ? "hero-input-ring--focused" : ""}`}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Que se passe-t-il sur le terrain ?"
            className="hero-input"
            autoComplete="off"
          />
          <button type="submit" className="hero-submit" aria-label="Submit">
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <div className="hero-pulse-line" />
      </motion.form>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.6 }}
        className="hero-status"
      >
        <span className="hero-status-dot" />
        Système en analyse…
      </motion.p>
    </div>
  );
}

const quickActions = [
  { icon: Flame, label: "Gérer une crise", action: "crise" },
  { icon: Star, label: "Améliorer mon image", action: "image" },
  { icon: Swords, label: "Répondre à une attaque", action: "attaque" },
  { icon: Megaphone, label: "Créer un message viral", action: "viral" },
];

const defaultData: DashboardData = {
  tension: { score: 0, label: "—", explanation: "Complétez votre profil pour des données personnalisées.", trend: "stable" },
  image_score: { score: 0, change: 0, explanation: "Complétez votre profil dans les paramètres." },
  recommendations: [
    { title: "Complétez votre profil", description: "Ajoutez votre rôle politique et région dans les paramètres.", urgency: "high" },
  ],
  events: [],
  greeting: "Bienvenue sur PIM !",
};

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] as const },
});

function AuthenticatedDashboard() {
  const [objective, setObjective] = useState("");
  const [actionType, setActionType] = useState("");
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  const goToStratege = (prefilledObjective?: string, prefilledAction?: string) => {
    const params = new URLSearchParams();
    if (prefilledObjective) params.set("q", prefilledObjective);
    if (prefilledAction) params.set("action", prefilledAction);
    navigate(`/stratege?${params.toString()}`);
  };

  const hasProfile = profile?.political_role && profile?.region;

  const fetchDashboard = async () => {
    if (!user || !hasProfile) return;
    setLoading(true);
    trackVisit();
    try {
      const { data, error } = await supabase.functions.invoke("dashboard-ai", {
        body: { political_role: profile.political_role, region: profile.region, full_name: profile.full_name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDashData(data);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message || "Impossible de charger les recommandations.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasProfile && !dashData) fetchDashboard();
  }, [hasProfile]);

  const d = dashData || defaultData;
  const TrendIcon = d.tension.trend === "up" ? TrendingUp : d.tension.trend === "down" ? TrendingDown : Minus;
  const tensionColor = d.tension.score >= 70 ? "text-warning" : d.tension.score >= 40 ? "text-gold" : "text-success";
  const changeColor = d.image_score.change >= 0 ? "text-success" : "text-destructive";
  const ChangeIcon = d.image_score.change >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="max-w-3xl mx-auto space-y-10 overflow-x-hidden">
      {/* Header */}
      <motion.div {...fadeUp()}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="system-text">Tableau de bord</p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {dashData ? d.greeting : "Bienvenue, gérez votre image politique."}
            </h1>
          </div>
          {hasProfile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchDashboard}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground h-8 w-8"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
        {hasProfile && dashData && (
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-2 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            {profile?.full_name} · {profile?.political_role} · {profile?.region}
          </p>
        )}
        <div className="system-line mt-6" />
      </motion.div>

      {/* Generation Bar */}
      <motion.div {...fadeUp(0.1)}>
        <p className="system-text mb-4">Génération stratégique</p>
        <div className="space-y-3">
          <Input
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Décrivez votre situation politique..."
            className="bg-muted/20 border-border/20 h-12 text-sm placeholder:text-muted-foreground/50"
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger className="w-full sm:w-[200px] bg-muted/20 border-border/20 h-10 text-sm">
                <SelectValue placeholder="Type d'action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="crise">Gérer une crise</SelectItem>
                <SelectItem value="image">Améliorer mon image</SelectItem>
                <SelectItem value="attaque">Répondre à une attaque</SelectItem>
                <SelectItem value="viral">Créer un message viral</SelectItem>
              </SelectContent>
            </Select>
            <Button
              className="h-10 px-6 text-sm font-medium tracking-tight w-full sm:w-auto"
              onClick={() => goToStratege(objective, actionType)}
            >
              Générer la stratégie
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-6">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => goToStratege(action.label, action.action)}
              className="flex items-center gap-2.5 p-3 rounded-lg bg-muted/10 hover:bg-muted/30 border border-border/10 hover:border-border/25 transition-all duration-200 text-xs text-left group"
            >
              <action.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 group-hover:text-foreground/70 transition-colors" />
              <span className="text-foreground/60 group-hover:text-foreground/90 transition-colors line-clamp-1">{action.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Loading state */}
      {loading && !dashData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-16 flex flex-col items-center gap-3"
        >
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
          <p className="text-muted-foreground/60 text-xs font-mono">Analyse en cours…</p>
        </motion.div>
      )}

      {/* Metrics */}
      {(!loading || dashData) && (
        <motion.div {...fadeUp(0.2)}>
          <p className="system-text mb-4">Indicateurs</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tension */}
            <div className="rounded-xl border border-border/15 bg-muted/5 p-5 space-y-3">
              <p className="text-xs text-muted-foreground/60 font-mono uppercase tracking-wider">Tension politique</p>
              <div className="flex items-end gap-2">
                <span className={`text-3xl font-semibold tracking-tighter ${tensionColor}`}>{d.tension.score}</span>
                <span className="text-xs text-muted-foreground/40 mb-1">/100</span>
              </div>
              <div className="w-full bg-muted/20 rounded-full h-1">
                <div
                  className={`h-1 rounded-full transition-all duration-700 ${d.tension.score >= 70 ? "bg-warning" : d.tension.score >= 40 ? "bg-gold" : "bg-success"}`}
                  style={{ width: `${d.tension.score}%` }}
                />
              </div>
              <p className={`text-xs ${tensionColor} flex items-center gap-1`}>
                <TrendIcon className="h-3 w-3" /> {d.tension.label}
              </p>
            </div>

            {/* Image score */}
            <div className="rounded-xl border border-border/15 bg-muted/5 p-5 space-y-3">
              <p className="text-xs text-muted-foreground/60 font-mono uppercase tracking-wider">Image publique</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-semibold tracking-tighter text-foreground">{d.image_score.score}</span>
                <span className="text-xs text-muted-foreground/40 mb-1">/100</span>
              </div>
              <div className="w-full bg-muted/20 rounded-full h-1">
                <div
                  className="h-1 rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${d.image_score.score}%` }}
                />
              </div>
              <p className={`text-xs ${changeColor} flex items-center gap-1`}>
                <ChangeIcon className="h-3 w-3" /> {d.image_score.change >= 0 ? "+" : ""}{d.image_score.change} pts
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Recommendations */}
      {(!loading || dashData) && (
        <motion.div {...fadeUp(0.25)}>
          <p className="system-text mb-4">
            {dashData ? "Recommandations personnalisées" : "Recommandations"}
          </p>
          <div className="space-y-1">
            {d.recommendations.map((rec, i) => (
              <div
                key={i}
                onClick={() => goToStratege(rec.title)}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/15 transition-colors duration-200 cursor-pointer group"
              >
                <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/40" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground/80">{rec.title}</p>
                  <p className="text-xs text-muted-foreground/50 line-clamp-1 mt-0.5">{rec.description}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Events */}
      {d.events.length > 0 && (
        <motion.div {...fadeUp(0.3)}>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground/40" />
            <p className="system-text">Calendrier politique</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {d.events.map((event, i) => (
              <div key={i} className="p-3.5 rounded-lg border border-border/15 bg-muted/5">
                <p className="text-[10px] text-muted-foreground/50 font-mono uppercase tracking-wider">{event.date}</p>
                <p className="text-sm mt-1.5 text-foreground/70">{event.title}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  return user ? <AuthenticatedDashboard /> : <HeroLanding />;
}
