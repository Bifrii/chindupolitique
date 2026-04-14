import { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Users, TrendingUp, MessageSquare, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DRCMap from "@/components/DRCMap";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { trackFeatureUsed, trackApiError } from "@/lib/operationalTracking";

interface ProvinceData {
  name: string;
  tension: number;
  explanation: string;
  actors: { name: string; role: string; position: string }[];
  hot_topics: string[];
  opportunity: string;
}

interface RadarData {
  provinces: ProvinceData[];
  global_summary: string;
}

const defaultProvinces: ProvinceData[] = [
  { name: "Kinshasa", tension: 65, explanation: "Tensions sociales liées au coût de la vie", actors: [], hot_topics: [], opportunity: "" },
  { name: "Nord-Kivu", tension: 92, explanation: "Conflit armé actif avec le M23", actors: [], hot_topics: [], opportunity: "" },
  { name: "Sud-Kivu", tension: 85, explanation: "Groupes armés et déplacements de populations", actors: [], hot_topics: [], opportunity: "" },
  { name: "Haut-Katanga", tension: 45, explanation: "Stabilité relative, enjeux miniers", actors: [], hot_topics: [], opportunity: "" },
  { name: "Lualaba", tension: 40, explanation: "Tensions modérées autour des ressources", actors: [], hot_topics: [], opportunity: "" },
  { name: "Kasaï", tension: 58, explanation: "Séquelles des violences passées", actors: [], hot_topics: [], opportunity: "" },
  { name: "Kasaï-Central", tension: 55, explanation: "Reconstruction en cours", actors: [], hot_topics: [], opportunity: "" },
  { name: "Kasaï-Oriental", tension: 50, explanation: "Tensions intercommunautaires", actors: [], hot_topics: [], opportunity: "" },
  { name: "Équateur", tension: 35, explanation: "Relative stabilité", actors: [], hot_topics: [], opportunity: "" },
  { name: "Mongala", tension: 30, explanation: "Zone calme", actors: [], hot_topics: [], opportunity: "" },
  { name: "Tshuapa", tension: 25, explanation: "Province isolée, peu de tensions", actors: [], hot_topics: [], opportunity: "" },
  { name: "Kongo-Central", tension: 38, explanation: "Enjeux liés au port de Matadi", actors: [], hot_topics: [], opportunity: "" },
  { name: "Tshopo", tension: 42, explanation: "Tensions foncières", actors: [], hot_topics: [], opportunity: "" },
  { name: "Ituri", tension: 88, explanation: "Violences intercommunautaires persistantes", actors: [], hot_topics: [], opportunity: "" },
  { name: "Haut-Uélé", tension: 48, explanation: "Menaces LRA résiduelles", actors: [], hot_topics: [], opportunity: "" },
  { name: "Bas-Uélé", tension: 35, explanation: "Calme relatif", actors: [], hot_topics: [], opportunity: "" },
  { name: "Maniema", tension: 40, explanation: "Tensions modérées", actors: [], hot_topics: [], opportunity: "" },
  { name: "Tanganyika", tension: 60, explanation: "Conflits Twa-Luba", actors: [], hot_topics: [], opportunity: "" },
  { name: "Haut-Lomami", tension: 45, explanation: "Enjeux de gouvernance locale", actors: [], hot_topics: [], opportunity: "" },
  { name: "Lomami", tension: 38, explanation: "Province relativement stable", actors: [], hot_topics: [], opportunity: "" },
  { name: "Sankuru", tension: 32, explanation: "Zone peu conflictuelle", actors: [], hot_topics: [], opportunity: "" },
  { name: "Mai-Ndombe", tension: 50, explanation: "Conflits fonciers et communautaires", actors: [], hot_topics: [], opportunity: "" },
  { name: "Kwilu", tension: 42, explanation: "Tensions politiques locales", actors: [], hot_topics: [], opportunity: "" },
  { name: "Kwango", tension: 35, explanation: "Calme", actors: [], hot_topics: [], opportunity: "" },
  { name: "Nord-Ubangi", tension: 38, explanation: "Flux de réfugiés centrafricains", actors: [], hot_topics: [], opportunity: "" },
  { name: "Sud-Ubangi", tension: 40, explanation: "Impact des réfugiés", actors: [], hot_topics: [], opportunity: "" },
];

function ProvinceDetail({ selected, onBack }: { selected: ProvinceData; onBack: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight text-foreground">{selected.name}</h2>
        <Button variant="ghost" size="sm" onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground">← Retour</Button>
      </div>

      <div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className={`text-3xl font-semibold tracking-tight ${
            selected.tension >= 80 ? "text-destructive" : selected.tension >= 50 ? "text-amber-500" : "text-emerald-500"
          }`}>{selected.tension}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
        <div className="w-full bg-muted/30 rounded-full h-1">
          <div className={`h-1 rounded-full transition-all duration-500 ${
            selected.tension >= 80 ? "bg-destructive" : selected.tension >= 50 ? "bg-amber-500" : "bg-emerald-500"
          }`} style={{ width: `${selected.tension}%` }} />
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{selected.explanation}</p>

      {selected.actors.length > 0 && (
        <div className="space-y-3">
          <p className="system-text tracking-widest flex items-center gap-2">
            <Users className="h-3 w-3" /> Acteurs clés
          </p>
          <div className="space-y-2">
            {selected.actors.map((a, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/20 hover:border-border/40 transition-colors">
                <div>
                  <p className="text-xs font-medium text-foreground">{a.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{a.role}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] bg-muted/50 border-0 font-normal">{a.position}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {selected.hot_topics.length > 0 && (
        <div className="space-y-3">
          <p className="system-text tracking-widest flex items-center gap-2">
            <TrendingUp className="h-3 w-3" /> Sujets sensibles
          </p>
          <div className="space-y-1.5">
            {selected.hot_topics.map((t, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border/20">
                <span className="text-[10px] font-mono text-muted-foreground mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                <p className="text-xs text-foreground/80 leading-relaxed">{t}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {selected.opportunity && (
        <div className="space-y-3">
          <p className="system-text tracking-widest flex items-center gap-2">
            <MessageSquare className="h-3 w-3" /> Opportunité
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed p-3 rounded-lg border border-border/20">{selected.opportunity}</p>
        </div>
      )}
    </div>
  );
}

export default function PoliticalRadar() {
  const [radarData, setRadarData] = useState<RadarData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const provinces = radarData?.provinces || defaultProvinces;
  const selected = provinces.find((p) => p.name === selectedProvince);

  const handleRefresh = async () => {
    setLoading(true);
    trackFeatureUsed("political_radar");
    try {
      const { data, error } = await supabase.functions.invoke("political-radar");
      if (error) { trackApiError("political-radar", 500); throw error; }
      if (data?.error) { trackApiError("political-radar"); throw new Error(data.error); }
      setRadarData(data);
      toast({ title: "Radar mis à jour", description: "Données de tension actualisées par l'IA." });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const avgTension = Math.round(provinces.reduce((s, p) => s + p.tension, 0) / provinces.length);
  const criticalCount = provinces.filter((p) => p.tension >= 80).length;
  const sortedProvinces = [...provinces].sort((a, b) => b.tension - a.tension);

  return (
    <div className="max-w-6xl mx-auto space-y-10 md:space-y-14 py-4 md:py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            Radar Politique
          </h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-md leading-relaxed">
            Intelligence en temps réel sur les tensions dans les 26 provinces.
          </p>
          <div className="system-line mt-6" />
        </div>
        <Button
          onClick={handleRefresh}
          disabled={loading}
          variant="ghost"
          className="font-medium w-full sm:w-auto h-10 px-6 rounded-xl bg-foreground/10 hover:bg-foreground/15 text-foreground border border-border/30"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2 text-muted-foreground" /> : <RefreshCw className="h-4 w-4 mr-2 text-muted-foreground" />}
          {loading ? "Analyse…" : "Actualiser"}
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.5 }} className="grid grid-cols-3 gap-3 md:gap-4">
        {[
          { label: "Tension moyenne", value: avgTension, color: avgTension >= 60 ? "text-amber-500" : "text-emerald-500" },
          { label: "Zones critiques", value: criticalCount, color: "text-destructive" },
          { label: "Provinces", value: 26, color: "text-foreground/70" },
        ].map((stat) => (
          <div key={stat.label} className="border border-border/20 rounded-xl p-4 md:p-5 text-center hover:border-border/40 transition-colors">
            <p className="system-text tracking-widest">{stat.label}</p>
            <p className={`text-2xl md:text-3xl font-semibold tracking-tight mt-2 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </motion.div>

      {/* AI Summary */}
      {radarData?.global_summary && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border border-border/20 rounded-xl p-4 md:p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground leading-relaxed">{radarData.global_summary}</p>
          </div>
        </motion.div>
      )}

      {/* Map + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }} className="border border-border/20 rounded-xl p-5 md:p-6 lg:col-span-3 hover:border-border/30 transition-colors">
          <p className="system-text tracking-widest mb-4">Carte des tensions</p>
          {loading && !radarData ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Analyse des 26 provinces…</p>
            </div>
          ) : (
            <div className="w-full overflow-hidden touch-pan-x touch-pan-y">
              <DRCMap provinces={provinces} selectedProvince={selectedProvince} onSelectProvince={setSelectedProvince} />
            </div>
          )}
        </motion.div>

        {/* Desktop detail panel */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }} className="border border-border/20 rounded-xl p-5 md:p-6 lg:col-span-2 hidden lg:block hover:border-border/30 transition-colors">
          {selected ? (
            <ProvinceDetail selected={selected} onBack={() => setSelectedProvince(null)} />
          ) : (
            <div>
              <p className="system-text tracking-widest mb-4">Classement</p>
              <div className="space-y-1 max-h-[450px] overflow-y-auto pr-1 scrollbar-hide">
                {sortedProvinces.map((p, i) => (
                  <button key={p.name} onClick={() => setSelectedProvince(p.name)} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors text-left group">
                    <span className="text-[10px] text-muted-foreground font-mono w-5">{String(i + 1).padStart(2, '0')}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate text-foreground/80 group-hover:text-foreground transition-colors">{p.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-14 bg-muted/20 rounded-full h-1">
                        <div className={`h-1 rounded-full ${p.tension >= 80 ? "bg-destructive" : p.tension >= 50 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${p.tension}%` }} />
                      </div>
                      <span className={`text-xs font-medium tracking-tight w-6 text-right ${p.tension >= 80 ? "text-destructive" : p.tension >= 50 ? "text-amber-500" : "text-emerald-500"}`}>{p.tension}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Mobile ranking */}
        <div className="lg:hidden border border-border/20 rounded-xl p-4">
          <p className="system-text tracking-widest mb-4">Classement</p>
          <div className="space-y-1 max-h-[300px] overflow-y-auto scrollbar-hide">
            {sortedProvinces.slice(0, 10).map((p, i) => (
              <button key={p.name} onClick={() => setSelectedProvince(p.name)} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors text-left">
                <span className="text-[10px] text-muted-foreground font-mono w-5">{String(i + 1).padStart(2, '0')}</span>
                <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate text-foreground/80">{p.name}</p></div>
                <div className="flex items-center gap-2">
                  <div className="w-12 bg-muted/20 rounded-full h-1">
                    <div className={`h-1 rounded-full ${p.tension >= 80 ? "bg-destructive" : p.tension >= 50 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${p.tension}%` }} />
                  </div>
                  <span className={`text-xs font-medium tracking-tight w-6 text-right ${p.tension >= 80 ? "text-destructive" : p.tension >= 50 ? "text-amber-500" : "text-emerald-500"}`}>{p.tension}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile bottom sheet */}
      {isMobile && (
        <Sheet open={!!selected} onOpenChange={(open) => !open && setSelectedProvince(null)}>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl border-border/20 bg-background">
            <SheetHeader><SheetTitle className="text-foreground">{selected?.name}</SheetTitle></SheetHeader>
            {selected && <div className="pt-4"><ProvinceDetail selected={selected} onBack={() => setSelectedProvince(null)} /></div>}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
