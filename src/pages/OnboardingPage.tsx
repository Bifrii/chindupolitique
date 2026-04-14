import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { trackOnboardingStarted, trackOnboardingCompleted } from "@/lib/operationalTracking";
import logo from "@/assets/logo.png";

const DRC_PROVINCES = [
  "Bas-Uélé", "Équateur", "Haut-Katanga", "Haut-Lomami", "Haut-Uélé",
  "Ituri", "Kasaï", "Kasaï-Central", "Kasaï-Oriental", "Kinshasa",
  "Kongo-Central", "Kwango", "Kwilu", "Lomami", "Lualaba",
  "Mai-Ndombe", "Maniema", "Mongala", "Nord-Kivu", "Nord-Ubangi",
  "Sankuru", "Sud-Kivu", "Sud-Ubangi", "Tanganyika", "Tshopo", "Tshuapa"
];

const ROLES = [
  { value: "depute", label: "🏛️ Député / Sénateur" },
  { value: "candidat", label: "🎯 Candidat aux élections" },
  { value: "activiste", label: "✊ Activiste politique" },
  { value: "leader", label: "👥 Leader communautaire" },
  { value: "communicant", label: "📰 Communicant politique" },
  { value: "analyste", label: "🔍 Analyste politique" },
  { value: "autre", label: "Autre" },
];

const RAYONNEMENT = ["Local", "Provincial", "National", "International"];

const OBJECTIFS = [
  "Gérer mon image publique",
  "Anticiper les crises",
  "Répondre aux attaques",
  "Créer du contenu viral",
  "Surveiller mes adversaires",
  "Planifier ma communication",
];

const STEP_LABELS = ["Identité", "Géographie", "Objectifs", "Réseaux"];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(profile?.full_name || user?.user_metadata?.full_name || "");
  const [role, setRole] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [province, setProvince] = useState("");
  const [territoire, setTerritoire] = useState("");
  const [rayonnement, setRayonnement] = useState("");
  const [objectifs, setObjectifs] = useState<string[]>([]);
  const [twitter, setTwitter] = useState("");
  const [facebook, setFacebook] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    trackOnboardingCompleted();
    const politicalRole = role === "autre" ? customRole : role;

    const { error } = await (supabase as any)
      .from("profiles")
      .update({
        full_name: fullName,
        political_role: politicalRole,
        region: province,
        territoire,
        rayonnement,
        objectifs,
        twitter_handle: twitter || null,
        facebook_url: facebook || null,
        whatsapp_number: whatsapp || null,
        instagram_handle: instagram || null,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      await refreshProfile();
      toast({ title: "Bienvenue sur PIM ! 🎉", description: "Votre profil est configuré." });
      navigate("/");
    }
    setSaving(false);
  };

  const canProceed = () => {
    if (step === 1) return fullName.trim() && role;
    if (step === 2) return province && rayonnement;
    if (step === 3) return objectifs.length > 0;
    return true;
  };

  const toggleObjectif = (obj: string) => {
    setObjectifs(prev => prev.includes(obj) ? prev.filter(o => o !== obj) : [...prev, obj]);
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-[440px]"
      >
        {/* Brand */}
        <div className="flex flex-col items-center mb-10">
          <img src={logo} alt="PIM" className="h-10 w-10 mb-4 opacity-70" />
          <h1 className="text-lg font-semibold tracking-tight text-foreground/90">Configuration</h1>
          <p className="system-text text-[10px] text-muted-foreground/50 tracking-widest uppercase mt-1">
            Étape {step} sur 4 · {STEP_LABELS[step - 1]}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
              <div className={`h-0.5 w-full rounded-full transition-colors duration-500 ${
                i + 1 <= step ? "bg-primary/60" : "bg-border/15"
              }`} />
              <span className={`system-text text-[9px] transition-colors ${
                i + 1 === step ? "text-foreground/70" : "text-muted-foreground/30"
              }`}>{label}</span>
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border/15 bg-card/30 backdrop-blur-sm overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.3 }}>
                <div className="p-6 space-y-5">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight text-foreground">Votre identité politique</h2>
                    <p className="text-xs text-muted-foreground/50 mt-0.5">Ces informations personnalisent votre expérience</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground/60">Nom complet</Label>
                      <Input value={fullName} onChange={e => setFullName(e.target.value)}
                        placeholder="Votre nom complet" className="bg-muted/10 border-border/15 h-10 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground/60">Rôle politique</Label>
                      <Select value={role} onValueChange={setRole}>
                        <SelectTrigger className="bg-muted/10 border-border/15 h-10 text-sm"><SelectValue placeholder="Sélectionnez votre rôle" /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {role === "autre" && (
                        <Input value={customRole} onChange={e => setCustomRole(e.target.value)}
                          placeholder="Précisez votre rôle" className="mt-2 bg-muted/10 border-border/15 h-10 text-sm" />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.3 }}>
                <div className="p-6 space-y-5">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight text-foreground">Votre zone géographique</h2>
                    <p className="text-xs text-muted-foreground/50 mt-0.5">Pour adapter la veille à votre contexte local</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground/60">Province principale</Label>
                      <Select value={province} onValueChange={setProvince}>
                        <SelectTrigger className="bg-muted/10 border-border/15 h-10 text-sm"><SelectValue placeholder="Sélectionnez votre province" /></SelectTrigger>
                        <SelectContent>
                          {DRC_PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground/60">Territoire / Commune</Label>
                      <Input value={territoire} onChange={e => setTerritoire(e.target.value)}
                        placeholder="Ex: Goma, Lubumbashi..." className="bg-muted/10 border-border/15 h-10 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground/60">Rayonnement</Label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {RAYONNEMENT.map(r => (
                          <button key={r} onClick={() => setRayonnement(r)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                              rayonnement === r
                                ? "bg-primary/10 border-primary/30 text-foreground"
                                : "bg-muted/5 border-border/15 text-muted-foreground/60 hover:text-foreground hover:border-border/30"
                            }`}>
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.3 }}>
                <div className="p-6 space-y-5">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight text-foreground">Vos objectifs prioritaires</h2>
                    <p className="text-xs text-muted-foreground/50 mt-0.5">Sélectionnez au moins un objectif</p>
                  </div>
                  <div className="space-y-2">
                    {OBJECTIFS.map(obj => (
                      <label key={obj}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                          objectifs.includes(obj)
                            ? "border-primary/25 bg-primary/5"
                            : "border-border/12 hover:border-border/25 bg-transparent"
                        }`}>
                        <Checkbox checked={objectifs.includes(obj)} onCheckedChange={() => toggleObjectif(obj)} />
                        <span className="text-sm text-foreground/80">{obj}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.3 }}>
                <div className="p-6 space-y-5">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight text-foreground">Vos réseaux sociaux</h2>
                    <p className="text-xs text-muted-foreground/50 mt-0.5">Optionnel — connectez vos comptes pour la veille</p>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground/60">Twitter/X</Label>
                      <Input value={twitter} onChange={e => setTwitter(e.target.value)}
                        placeholder="@votre_handle" className="bg-muted/10 border-border/15 h-10 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground/60">Facebook</Label>
                      <Input value={facebook} onChange={e => setFacebook(e.target.value)}
                        placeholder="URL de votre page" className="bg-muted/10 border-border/15 h-10 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground/60">WhatsApp</Label>
                      <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                        placeholder="+243..." className="bg-muted/10 border-border/15 h-10 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground/60">Instagram</Label>
                      <Input value={instagram} onChange={e => setInstagram(e.target.value)}
                        placeholder="@votre_handle" className="bg-muted/10 border-border/15 h-10 text-sm" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/10">
            {step > 1 ? (
              <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)} className="gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-3.5 w-3.5" /> Précédent
              </Button>
            ) : <div />}
            {step < 4 ? (
              <Button size="sm" onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="gap-1 text-xs font-medium">
                Suivant <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleFinish} disabled={saving} className="gap-1.5 text-xs font-medium">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Terminer
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
