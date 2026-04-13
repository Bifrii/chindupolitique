import { useState } from "react";
import { motion } from "framer-motion";
import { Flame, Star, Swords, Zap, Copy, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { saveArchive } from "@/lib/archiveService";
import { useGuestUsage } from "@/hooks/useGuestUsage";
import { PremiumLoginModal } from "@/components/PremiumLoginModal";

const tabs = [
  { value: "crise", label: "Crise", fullLabel: "Gérer une crise", icon: Flame },
  { value: "image", label: "Image", fullLabel: "Améliorer mon image", icon: Star },
  { value: "attaque", label: "Attaque", fullLabel: "Répondre à une attaque", icon: Swords },
  { value: "viral", label: "Viral", fullLabel: "Message viral", icon: Zap },
];

export default function ContentGenerator() {
  const [activeTab, setActiveTab] = useState("crise");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();
  const { checkAndIncrement, showLoginModal, setShowLoginModal } = useGuestUsage();

  const [crisisInput, setCrisisInput] = useState("");
  const [imagePerception, setImagePerception] = useState("");
  const [imageAudience, setImageAudience] = useState("");
  const [imageStrengths, setImageStrengths] = useState("");
  const [attackInput, setAttackInput] = useState("");
  const [attackType, setAttackType] = useState("");
  const [viralTopic, setViralTopic] = useState("");
  const [viralAudience, setViralAudience] = useState("");
  const [viralEmotion, setViralEmotion] = useState("");

  const [crisisResult, setCrisisResult] = useState<any>(null);
  const [imageResult, setImageResult] = useState<any>(null);
  const [attackResult, setAttackResult] = useState<any>(null);
  const [viralResult, setViralResult] = useState<any>(null);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copié !" });
  };

  const generate = async (tab: string, input: string, setResult: (r: any) => void) => {
    if (!input.trim()) {
      toast({ title: "Champ requis", description: "Veuillez remplir les informations.", variant: "destructive" });
      return;
    }
    if (!checkAndIncrement()) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: { tab, input, userProfile: profile },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setResult(data);
      const tabLabels: Record<string, string> = { crise: "Plan de crise", image: "Campagne d'image", attaque: "Réponse à attaque", viral: "Message viral" };
      saveArchive({
        type: tab,
        title: `${tabLabels[tab] || tab} : ${input.slice(0, 60)}`,
        summary: input.slice(0, 150),
        content: data,
        source_module: "generer",
      });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message || "Impossible de générer le contenu.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "bg-muted/30 border-border/30 text-sm rounded-xl focus:border-border/60 focus:ring-0 placeholder:text-muted-foreground/50 transition-colors h-11";
  const textareaClass = `${inputClass} min-h-[120px] md:min-h-[150px] resize-none leading-relaxed`;

  const ActionButton = ({ onClick, isLoading, label }: { onClick: () => void; isLoading: boolean; label: string }) => (
    <Button
      onClick={onClick}
      disabled={loading}
      variant="ghost"
      className="font-medium w-full md:w-auto h-11 px-8 rounded-xl bg-foreground/10 hover:bg-foreground/15 text-foreground border border-border/30 transition-all"
    >
      {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2 text-muted-foreground" /> Génération…</> : label}
    </Button>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-10 md:space-y-14 py-4 md:py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          Générateur de contenu
        </h1>
        <p className="text-muted-foreground text-sm mt-2 max-w-lg leading-relaxed">
          Créez du contenu politique percutant adapté au contexte congolais.
        </p>
        <div className="system-line mt-6" />
      </motion.div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)}>
        <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 md:mx-0 md:px-0">
          <TabsList className="bg-transparent border border-border/20 w-max md:w-auto inline-flex md:grid md:grid-cols-4 h-auto rounded-xl p-1">
            {tabs.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="gap-2 rounded-lg text-xs font-medium data-[state=active]:bg-muted/50 data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground whitespace-nowrap transition-colors"
              >
                <t.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.fullLabel}</span>
                <span className="sm:hidden">{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Crise */}
        <TabsContent value="crise" className="space-y-6 mt-6">
          <div className="space-y-5">
            <p className="system-text tracking-widest">Gérer une crise politique</p>
            <Textarea value={crisisInput} onChange={(e) => setCrisisInput(e.target.value)} placeholder="Décrivez la crise en cours…" className={textareaClass} />
            <ActionButton onClick={() => generate("crise", `Crise : ${crisisInput}`, setCrisisResult)} isLoading={loading && activeTab === "crise"} label="Générer le plan de crise" />
          </div>
          {crisisResult?.phases && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="system-line" />
              {crisisResult.phases.map((phase: any, i: number) => (
                <div key={i} className="border border-border/20 rounded-xl p-5 space-y-3 hover:border-border/40 transition-colors">
                  <h3 className="text-sm font-medium text-foreground">{phase.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{phase.description}</p>
                  <div className="p-4 rounded-lg border border-border/15 bg-muted/20">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary" className="text-[10px] bg-muted/50 border-0 font-normal text-muted-foreground">Facebook</Badge>
                      <Button variant="ghost" size="sm" onClick={() => copy(phase.post)} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" /></Button>
                    </div>
                    <p className="text-sm text-foreground/70 leading-relaxed italic">"{phase.post}"</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </TabsContent>

        {/* Image */}
        <TabsContent value="image" className="space-y-6 mt-6">
          <div className="space-y-5">
            <p className="system-text tracking-widest">Améliorer votre image publique</p>
            <Input value={imagePerception} onChange={(e) => setImagePerception(e.target.value)} placeholder="Perception actuelle (ex: perçu comme distant)" className={inputClass} />
            <Input value={imageAudience} onChange={(e) => setImageAudience(e.target.value)} placeholder="Audience cible (ex: jeunesse urbaine de Kinshasa)" className={inputClass} />
            <Input value={imageStrengths} onChange={(e) => setImageStrengths(e.target.value)} placeholder="Points forts à mettre en avant" className={inputClass} />
            <ActionButton onClick={() => generate("image", `Perception actuelle: ${imagePerception}. Audience cible: ${imageAudience}. Points forts: ${imageStrengths}`, setImageResult)} isLoading={loading && activeTab === "image"} label="Générer le plan de campagne" />
          </div>
          {imageResult?.weeks && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="system-line" />
              <p className="system-text tracking-widest">Plan de campagne — 30 jours</p>
              {imageResult.weeks.map((week: any, i: number) => (
                <div key={i} className="border border-border/20 rounded-xl p-5 space-y-3 hover:border-border/40 transition-colors">
                  <p className="text-xs font-medium text-foreground/70 uppercase tracking-wider">{week.week} — {week.theme}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-4 rounded-lg border border-border/15 bg-muted/20">
                      <div className="flex justify-between items-start">
                        <p className="text-sm text-foreground/70 leading-relaxed">{week.post}</p>
                        <Button variant="ghost" size="sm" onClick={() => copy(week.post)} className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" /></Button>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border border-border/15 bg-muted/20 text-sm text-foreground/70 leading-relaxed">{week.action}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </TabsContent>

        {/* Attaque */}
        <TabsContent value="attaque" className="space-y-6 mt-6">
          <div className="space-y-5">
            <p className="system-text tracking-widest">Répondre à une attaque</p>
            <Textarea value={attackInput} onChange={(e) => setAttackInput(e.target.value)} placeholder="Collez l'attaque ou l'accusation…" className={textareaClass} />
            <Select value={attackType} onValueChange={setAttackType}>
              <SelectTrigger className={inputClass}><SelectValue placeholder="Type d'attaque" /></SelectTrigger>
              <SelectContent className="bg-card border-border/30">
                <SelectItem value="verbal">Attaque verbale</SelectItem>
                <SelectItem value="media">Attaque médiatique</SelectItem>
                <SelectItem value="manoeuvre">Manœuvre politique</SelectItem>
                <SelectItem value="rumeur">Rumeur</SelectItem>
              </SelectContent>
            </Select>
            <ActionButton onClick={() => generate("attaque", `Type d'attaque: ${attackType || "non spécifié"}. Contenu: ${attackInput}`, setAttackResult)} isLoading={loading && activeTab === "attaque"} label="Générer les réponses" />
          </div>
          {attackResult?.responses && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="system-line" />
              {attackResult.responses.map((r: any, i: number) => (
                <div key={i} className="border border-border/20 rounded-xl p-5 space-y-3 hover:border-border/40 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-sm font-medium text-foreground">{r.title}</h3>
                    <Badge variant="outline" className="text-[10px] w-fit border-border/30 text-muted-foreground font-normal">{r.tone}</Badge>
                  </div>
                  <p className="text-sm text-foreground/70 leading-relaxed">{r.text}</p>
                  <Button variant="ghost" size="sm" onClick={() => copy(r.text)} className="h-8 text-xs text-muted-foreground hover:text-foreground px-3">
                    <Copy className="h-3 w-3 mr-1.5" /> Copier
                  </Button>
                </div>
              ))}
            </motion.div>
          )}
        </TabsContent>

        {/* Viral */}
        <TabsContent value="viral" className="space-y-6 mt-6">
          <div className="space-y-5">
            <p className="system-text tracking-widest">Créer un message viral</p>
            <Input value={viralTopic} onChange={(e) => setViralTopic(e.target.value)} placeholder="Sujet du message (ex: emploi des jeunes)" className={inputClass} />
            <Input value={viralAudience} onChange={(e) => setViralAudience(e.target.value)} placeholder="Audience cible" className={inputClass} />
            <Select value={viralEmotion} onValueChange={setViralEmotion}>
              <SelectTrigger className={inputClass}><SelectValue placeholder="Émotion souhaitée" /></SelectTrigger>
              <SelectContent className="bg-card border-border/30">
                <SelectItem value="espoir">Espoir</SelectItem>
                <SelectItem value="colere">Colère</SelectItem>
                <SelectItem value="fierte">Fierté</SelectItem>
                <SelectItem value="solidarite">Solidarité</SelectItem>
              </SelectContent>
            </Select>
            <ActionButton onClick={() => generate("viral", `Sujet: ${viralTopic}. Audience: ${viralAudience}. Émotion: ${viralEmotion || "non spécifiée"}`, setViralResult)} isLoading={loading && activeTab === "viral"} label="Générer les messages" />
          </div>
          {viralResult?.posts && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="system-line" />
              {viralResult.posts.map((post: any, i: number) => (
                <div key={i} className="border border-border/20 rounded-xl p-5 space-y-3 hover:border-border/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="system-text">Variation {String(i + 1).padStart(2, '0')}</span>
                    <span className="text-xs font-medium text-muted-foreground tracking-tight">Score : {post.score}/100</span>
                  </div>
                  <p className="text-sm text-foreground/70 leading-relaxed">{post.text}</p>
                  {post.emotion && <Badge variant="outline" className="text-[10px] border-border/30 text-muted-foreground font-normal">{post.emotion}</Badge>}
                  <Button variant="ghost" size="sm" onClick={() => copy(post.text)} className="h-8 text-xs text-muted-foreground hover:text-foreground px-3">
                    <Copy className="h-3 w-3 mr-1.5" /> Copier
                  </Button>
                </div>
              ))}
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
      <PremiumLoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
    </div>
  );
}
