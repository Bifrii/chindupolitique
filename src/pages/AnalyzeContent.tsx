import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Copy, Facebook, Twitter, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { saveArchive } from "@/lib/archiveService";
import { useGuestUsage } from "@/hooks/useGuestUsage";
import { PremiumLoginModal } from "@/components/PremiumLoginModal";

const relations = [
  { value: "rival", label: "Rival", color: "bg-destructive/60" },
  { value: "adversaire", label: "Adversaire", color: "bg-orange-500/60" },
  { value: "opposant", label: "Opposant", color: "bg-amber-500/60" },
  { value: "allie", label: "Allié", color: "bg-emerald-500/60" },
  { value: "officiel", label: "Officiel", color: "bg-primary/60" },
  { value: "superieur", label: "Supérieur", color: "bg-muted-foreground/40" },
  { value: "appui", label: "Appui / Soutien", color: "bg-purple-500/60" },
];

interface Analysis {
  forces: string[];
  faiblesses: string[];
  intention: string;
  dangerosite: "low" | "medium" | "high";
  reponses: { title: string; text: string; platform: string; tone: string }[];
}

const platformIcon = (p: string) => {
  if (p.includes("Facebook")) return Facebook;
  if (p.includes("Twitter")) return Twitter;
  return MessageCircle;
};

const dangerLabels = { low: "Faible", medium: "Moyen", high: "Élevé" };
const dangerVariants = { low: "secondary", medium: "outline", high: "destructive" } as const;

export default function AnalyzeContent() {
  const [content, setContent] = useState("");
  const [relation, setRelation] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();
  const { checkAndIncrement, showLoginModal, setShowLoginModal } = useGuestUsage();

  const handleAnalyze = async () => {
    if (!content || !relation) {
      toast({ title: "Champs requis", description: "Veuillez remplir le contenu et sélectionner la relation.", variant: "destructive" });
      return;
    }
    if (!checkAndIncrement()) return;
    setLoading(true);
    setAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-content", {
        body: { content, relation, userProfile: profile },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setAnalysis(data);
      saveArchive({
        type: "analyse",
        title: `Analyse : ${content.slice(0, 60)}...`,
        summary: `Intention: ${data.intention} — Dangerosité: ${data.dangerosite}`,
        content: data,
        source_module: "analyser",
      });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message || "Impossible d'analyser le contenu.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copié !" });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10 md:space-y-14 py-4 md:py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          Analyseur de contenu
        </h1>
        <p className="text-muted-foreground text-sm mt-2 max-w-lg leading-relaxed">
          Collez un discours ou une publication. Le système identifie les forces, faiblesses et génère des réponses stratégiques.
        </p>
        <div className="system-line mt-6" />
      </motion.div>

      {/* Input section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="space-y-6"
      >
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Collez ici une publication, un discours ou un message à analyser..."
          className="min-h-[140px] md:min-h-[180px] bg-muted/30 border-border/30 text-sm leading-relaxed resize-none rounded-xl focus:border-border/60 focus:ring-0 placeholder:text-muted-foreground/50 transition-colors"
        />

        <div>
          <p className="system-text mb-3 tracking-widest">Relation avec l'auteur</p>
          <div className="flex overflow-x-auto md:flex-wrap gap-2 pb-1 scrollbar-hide">
            {relations.map((r) => (
              <button
                key={r.value}
                onClick={() => setRelation(r.value)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border transition-all whitespace-nowrap shrink-0 ${
                  relation === r.value
                    ? "border-border bg-muted text-foreground"
                    : "border-border/20 text-muted-foreground hover:border-border/50 hover:text-foreground/80"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${r.color}`} />
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleAnalyze}
          disabled={loading}
          className="font-medium px-8 h-11 rounded-xl w-full md:w-auto bg-foreground/10 hover:bg-foreground/15 text-foreground border border-border/30 transition-all"
          variant="ghost"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2 text-muted-foreground" /> Analyse en cours…</>
          ) : (
            <><Shield className="h-4 w-4 mr-2 text-muted-foreground" /> Analyser</>
          )}
        </Button>
      </motion.div>

      {/* Results */}
      {analysis && (
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-10">
          {/* Analysis card */}
          <div className="space-y-8">
            <div>
              <p className="system-text mb-6 tracking-widest">Résultat de l'analyse</p>
              <div className="system-line mb-6" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <p className="text-xs font-medium text-foreground/70 uppercase tracking-wider">Forces</p>
                <ul className="space-y-2">
                  {analysis.forces.map((f, i) => (
                    <li key={i} className="text-sm text-muted-foreground leading-relaxed pl-3 border-l border-border/40">{f}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-medium text-foreground/70 uppercase tracking-wider">Faiblesses</p>
                <ul className="space-y-2">
                  {analysis.faiblesses.map((f, i) => (
                    <li key={i} className="text-sm text-muted-foreground leading-relaxed pl-3 border-l border-border/40">{f}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground/70 uppercase tracking-wider">Intention probable</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{analysis.intention}</p>
            </div>

            <div className="flex items-center gap-3">
              <p className="text-xs font-medium text-foreground/70 uppercase tracking-wider">Dangerosité</p>
              <Badge variant={dangerVariants[analysis.dangerosite]} className="uppercase text-[10px] tracking-wider font-medium">
                {dangerLabels[analysis.dangerosite]}
              </Badge>
            </div>
          </div>

          {/* Responses */}
          <div className="space-y-6">
            <div>
              <p className="system-text mb-2 tracking-widest">Réponses stratégiques</p>
              <div className="system-line" />
            </div>

            {analysis.reponses.map((rep, i) => {
              const PlatformIcon = platformIcon(rep.platform);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * i, duration: 0.4 }}
                  className="border border-border/20 rounded-xl p-5 md:p-6 space-y-4 hover:border-border/40 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-sm font-medium text-foreground">{rep.title}</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] font-normal bg-muted/50 text-muted-foreground border-0">
                        <PlatformIcon className="h-3 w-3 mr-1" />
                        {rep.platform}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-normal border-border/30 text-muted-foreground">{rep.tone}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-foreground/70 leading-relaxed">{rep.text}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(rep.text)}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground px-3"
                  >
                    <Copy className="h-3 w-3 mr-1.5" /> Copier
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
      <PremiumLoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
    </div>
  );
}
