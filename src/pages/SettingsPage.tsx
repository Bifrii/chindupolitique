import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, User, MapPin, Briefcase, Loader2, Save, Twitter, CheckCircle, XCircle, ExternalLink, BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";

const PROVINCES_RDC = [
  "Kinshasa", "Nord-Kivu", "Sud-Kivu", "Haut-Katanga", "Lualaba",
  "Kasaï", "Kasaï-Central", "Kasaï-Oriental", "Équateur", "Mongala",
  "Tshuapa", "Kongo-Central", "Tshopo", "Ituri", "Haut-Uélé",
  "Bas-Uélé", "Maniema", "Tanganyika", "Haut-Lomami", "Lomami",
  "Sankuru", "Mai-Ndombe", "Kwilu", "Kwango", "Nord-Ubangi", "Sud-Ubangi",
];

const ROLES_POLITIQUES = [
  { value: "depute", label: "Député national" },
  { value: "senateur", label: "Sénateur" },
  { value: "depute_provincial", label: "Député provincial" },
  { value: "gouverneur", label: "Gouverneur" },
  { value: "ministre", label: "Ministre" },
  { value: "maire", label: "Maire / Bourgmestre" },
  { value: "candidat", label: "Candidat" },
  { value: "activiste", label: "Activiste" },
  { value: "leader", label: "Leader communautaire" },
  { value: "journaliste", label: "Journaliste politique" },
  { value: "consultant", label: "Consultant politique" },
  { value: "autre", label: "Autre" },
];

interface TwitterConnection {
  twitter_username: string;
  connected_at: string;
}

interface ApiUsage {
  tweets_this_month: number;
  max_tweets: number;
}

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [politicalRole, setPoliticalRole] = useState("");
  const [region, setRegion] = useState("");
  const [saving, setSaving] = useState(false);

  const [twitterConnection, setTwitterConnection] = useState<TwitterConnection | null>(null);
  const [twitterLoading, setTwitterLoading] = useState(false);
  const [connectingTwitter, setConnectingTwitter] = useState(false);
  const [disconnectingTwitter, setDisconnectingTwitter] = useState(false);
  const [apiUsage, setApiUsage] = useState<ApiUsage>({ tweets_this_month: 0, max_tweets: 1500 });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPoliticalRole(profile.political_role || "");
      setRegion(profile.region || "");
    }
  }, [profile]);

  useEffect(() => {
    const twitterStatus = searchParams.get("twitter");
    if (twitterStatus === "success") {
      const username = searchParams.get("username");
      toast({ title: "Twitter connecté !", description: `Compte @${username} lié avec succès.` });
      fetchTwitterConnection();
    } else if (twitterStatus === "error") {
      const reason = searchParams.get("reason");
      toast({ title: "Erreur de connexion Twitter", description: `Raison : ${reason || "inconnue"}`, variant: "destructive" });
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      fetchTwitterConnection();
      fetchApiUsage();
    }
  }, [user]);

  const fetchTwitterConnection = async () => {
    setTwitterLoading(true);
    const { data } = await (supabase as any)
      .from("twitter_tokens")
      .select("twitter_username, connected_at")
      .eq("user_id", user?.id)
      .single();
    if (data) setTwitterConnection(data);
    else setTwitterConnection(null);
    setTwitterLoading(false);
  };

  const fetchApiUsage = async () => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await (supabase as any)
      .from("api_logs")
      .select("id")
      .eq("user_id", user?.id)
      .eq("action", "publish_tweet")
      .eq("status", "success")
      .gte("created_at", startOfMonth.toISOString());

    if (!error && data) {
      setApiUsage({ tweets_this_month: data.length, max_tweets: 1500 });
    }
  };

  const handleConnectTwitter = async () => {
    setConnectingTwitter(true);
    try {
      const { data, error } = await supabase.functions.invoke("twitter-oauth-start");
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message || "Impossible de démarrer la connexion Twitter", variant: "destructive" });
      setConnectingTwitter(false);
    }
  };

  const handleDisconnectTwitter = async () => {
    setDisconnectingTwitter(true);
    const { error } = await (supabase as any)
      .from("twitter_tokens")
      .delete()
      .eq("user_id", user?.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setTwitterConnection(null);
      toast({ title: "Twitter déconnecté" });
    }
    setDisconnectingTwitter(false);
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="space-y-2">
            <span className="system-text text-[11px] tracking-widest text-muted-foreground/60">SYSTÈME</span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Paramètres</h1>
          </div>
          <div className="system-line" />
          <p className="text-sm text-muted-foreground">Connectez-vous pour accéder à vos paramètres.</p>
          <Button className="font-medium" onClick={() => navigate("/auth")}>Se connecter</Button>
        </motion.div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast({ title: "Erreur", description: "Le nom complet est requis.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from("profiles").update({
      full_name: fullName.trim(),
      political_role: politicalRole || null,
      region: region || null,
    }).eq("id", user.id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      await refreshProfile();
      toast({ title: "Profil mis à jour !", description: "Vos informations ont été sauvegardées." });
    }
    setSaving(false);
  };

  const usagePercent = (apiUsage.tweets_this_month / apiUsage.max_tweets) * 100;

  return (
    <div className="max-w-xl mx-auto space-y-10 py-6 px-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        <span className="system-text text-[11px] tracking-widest text-muted-foreground/60">CONFIGURATION</span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Paramètres</h1>
        <p className="text-sm text-muted-foreground/70">Profil et connexions.</p>
        <div className="system-line" />
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="profil" className="w-full">
        <TabsList className="w-full grid grid-cols-2 bg-muted/30 border border-border/20 rounded-lg h-10">
          <TabsTrigger value="profil" className="gap-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md transition-all">
            <User className="h-3.5 w-3.5" /> Profil
          </TabsTrigger>
          <TabsTrigger value="connexions" className="gap-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md transition-all">
            <Twitter className="h-3.5 w-3.5" /> Connexions
          </TabsTrigger>
        </TabsList>

        {/* PROFIL TAB */}
        <TabsContent value="profil">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-8 pt-6">
            <div className="space-y-1">
              <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground/60" />
                Profil politique
              </h2>
              <p className="text-xs text-muted-foreground/50">Informations personnelles et rôle.</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground/70">Nom complet</Label>
                <Input
                  placeholder="Votre nom"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-muted/20 border-border/20 focus:border-border/40 h-10 text-sm"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground/70">Email</Label>
                <Input
                  type="email"
                  value={user.email || ""}
                  disabled
                  className="bg-muted/10 border-border/15 opacity-50 h-10 text-sm"
                />
                <p className="text-[11px] text-muted-foreground/40">Non modifiable.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
                  <Briefcase className="h-3 w-3" /> Rôle politique
                </Label>
                <Select value={politicalRole} onValueChange={setPoliticalRole}>
                  <SelectTrigger className="bg-muted/20 border-border/20 h-10 text-sm">
                    <SelectValue placeholder="Sélectionnez votre rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES_POLITIQUES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" /> Province en RDC
                </Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger className="bg-muted/20 border-border/20 h-10 text-sm">
                    <SelectValue placeholder="Sélectionnez votre province" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVINCES_RDC.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="system-line" />

            <Button
              className="w-full font-medium h-10 text-sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Sauvegarde...</>
              ) : (
                <><Save className="h-3.5 w-3.5 mr-2" /> Sauvegarder</>
              )}
            </Button>
          </motion.div>
        </TabsContent>

        {/* CONNEXIONS TAB */}
        <TabsContent value="connexions">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-8 pt-6">

            {/* Twitter Connection */}
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Twitter className="h-4 w-4 text-muted-foreground/60" />
                  Twitter / X
                </h3>
                <p className="text-xs text-muted-foreground/50">
                  Publication directe et métriques en temps réel.
                </p>
              </div>

              <div className="system-line" />

              {twitterLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground/60 py-4">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Chargement...
                </div>
              ) : twitterConnection ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/15">
                    <div className="h-9 w-9 rounded-full bg-muted/30 flex items-center justify-center">
                      <Twitter className="h-4 w-4 text-muted-foreground/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">@{twitterConnection.twitter_username}</p>
                      <p className="text-[11px] text-muted-foreground/50">
                        Connecté le {new Date(twitterConnection.connected_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-400/80 border-emerald-500/20 gap-1 text-[10px]" variant="outline">
                      <CheckCircle className="h-2.5 w-2.5" /> Actif
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5 border border-border/10"
                    onClick={handleDisconnectTwitter}
                    disabled={disconnectingTwitter}
                  >
                    {disconnectingTwitter ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <XCircle className="h-3 w-3 mr-1.5" />}
                    Déconnecter
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full gap-2 h-10 text-sm"
                  onClick={handleConnectTwitter}
                  disabled={connectingTwitter}
                >
                  {connectingTwitter ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Connexion...</>
                  ) : (
                    <><ExternalLink className="h-3.5 w-3.5" /> Connecter via Twitter/X</>
                  )}
                </Button>
              )}
            </div>

            {/* API Usage */}
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground/60" />
                  Utilisation API
                </h3>
                <p className="text-xs text-muted-foreground/50">Tweets publiés ce mois.</p>
              </div>

              <div className="system-line" />

              <div className="space-y-3 p-4 rounded-lg bg-muted/15 border border-border/15">
                <div className="flex justify-between items-baseline">
                  <span className="system-text text-[11px] text-muted-foreground/50">PUBLICATIONS</span>
                  <span className="text-sm font-medium text-foreground tabular-nums">
                    {apiUsage.tweets_this_month}
                    <span className="text-muted-foreground/40 font-normal"> / {apiUsage.max_tweets}</span>
                  </span>
                </div>
                <Progress value={usagePercent} className="h-1.5" />
                <p className="text-[11px] text-muted-foreground/40">
                  {usagePercent > 80
                    ? "⚠️ Approche de la limite mensuelle."
                    : "Utilisation normale."}
                </p>
              </div>
            </div>

          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
