import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Shield, Loader2, Save, Trash2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

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

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] as const },
});

export default function ProfilePage() {
  const { user, profile, refreshProfile, updatePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [province, setProvince] = useState("");
  const [territoire, setTerritoire] = useState("");
  const [rayonnement, setRayonnement] = useState("");
  const [objectifs, setObjectifs] = useState<string[]>([]);
  const [twitter, setTwitter] = useState("");
  const [facebook, setFacebook] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [saving, setSaving] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [stats, setStats] = useState({ analyses: 0, posts: 0, planifies: 0 });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setRole(profile.political_role || "");
      setProvince(profile.region || "");
      setTerritoire(profile.territoire || "");
      setRayonnement(profile.rayonnement || "");
      setObjectifs(profile.objectifs || []);
      setTwitter(profile.twitter_handle || "");
      setFacebook(profile.facebook_url || "");
      setWhatsapp(profile.whatsapp_number || "");
      setInstagram(profile.instagram_handle || "");
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const [repliques, planifies] = await Promise.all([
        (supabase as any).from("veille_repliques").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        (supabase as any).from("posts_planifies").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setStats({
        analyses: 0,
        posts: repliques.count || 0,
        planifies: planifies.count || 0,
      });
    };
    fetchStats();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("profiles")
      .update({
        full_name: fullName,
        political_role: role,
        region: province,
        territoire,
        rayonnement,
        objectifs,
        twitter_handle: twitter || null,
        facebook_url: facebook || null,
        whatsapp_number: whatsapp || null,
        instagram_handle: instagram || null,
      })
      .eq("id", user.id);

    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { await refreshProfile(); toast({ title: "Profil mis à jour !" }); }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Erreur", description: "Minimum 8 caractères.", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await updatePassword(newPassword);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Mot de passe modifié !" });
      setNewPassword(""); setConfirmNewPassword("");
    }
    setChangingPassword(false);
  };

  const handleSignOutAll = async () => {
    await supabase.auth.signOut({ scope: "global" });
    navigate("/login");
  };

  const toggleObjectif = (obj: string) => {
    setObjectifs(prev => prev.includes(obj) ? prev.filter(o => o !== obj) : [...prev, obj]);
  };

  const memberSince = profile?.created_at ? new Date(profile.created_at).toLocaleDateString("fr-FR", { year: "numeric", month: "long" }) : "—";

  return (
    <div className="max-w-xl mx-auto space-y-10 py-2">
      {/* Header */}
      <motion.div {...fadeUp(0)}>
        <span className="system-text text-[11px] text-muted-foreground/50 tracking-widest uppercase">
          Système · Profil utilisateur
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-1">
          Mon profil
        </h1>
      </motion.div>

      {/* Profile Card */}
      <motion.div {...fadeUp(0.05)} className="rounded-xl border border-border/15 bg-card/40 backdrop-blur-sm p-6">
        <div className="flex items-center gap-5">
          <Avatar className="h-16 w-16 ring-1 ring-border/20">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="text-sm font-medium bg-muted/30 text-muted-foreground">
              {fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold text-foreground">{fullName || "—"}</h2>
            <p className="text-sm text-muted-foreground/70">{ROLES.find(r => r.value === role)?.label || role || "—"}</p>
            <p className="text-xs text-muted-foreground/50">{province ? `${province}, RDC` : "—"}</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div {...fadeUp(0.1)} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Posts générés", value: stats.posts },
          { label: "Posts planifiés", value: stats.planifies },
          { label: "Analyses", value: stats.analyses },
          { label: "Membre depuis", value: memberSince },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border/15 bg-card/30 p-4 text-center">
            <p className="text-xl font-semibold text-foreground">{s.value}</p>
            <p className="system-text text-[10px] text-muted-foreground/50 mt-1">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Informations personnelles */}
      <motion.div {...fadeUp(0.15)} className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground tracking-tight">Informations personnelles</h3>
          <div className="system-line mt-3" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground/60">Nom complet</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} className="bg-muted/10 border-border/15 h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground/60">Rôle politique</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="bg-muted/10 border-border/15 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground/60">Province</Label>
            <Select value={province} onValueChange={setProvince}>
              <SelectTrigger className="bg-muted/10 border-border/15 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DRC_PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground/60">Territoire / Commune</Label>
            <Input value={territoire} onChange={e => setTerritoire(e.target.value)} className="bg-muted/10 border-border/15 h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground/60">Rayonnement</Label>
            <Select value={rayonnement} onValueChange={setRayonnement}>
              <SelectTrigger className="bg-muted/10 border-border/15 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RAYONNEMENT.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2.5">
          <Label className="text-xs text-muted-foreground/60">Objectifs prioritaires</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {OBJECTIFS.map(obj => (
              <label key={obj} className="flex items-center gap-2.5 text-sm text-muted-foreground/80 cursor-pointer hover:text-foreground transition-colors py-0.5">
                <Checkbox checked={objectifs.includes(obj)} onCheckedChange={() => toggleObjectif(obj)} />
                {obj}
              </label>
            ))}
          </div>
        </div>

        <div className="system-line" />

        <div>
          <span className="system-text text-[10px] text-muted-foreground/40 tracking-widest uppercase">Réseaux sociaux</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground/60">Twitter/X</Label>
              <Input value={twitter} onChange={e => setTwitter(e.target.value)} placeholder="@handle" className="bg-muted/10 border-border/15 h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground/60">Facebook</Label>
              <Input value={facebook} onChange={e => setFacebook(e.target.value)} placeholder="URL" className="bg-muted/10 border-border/15 h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground/60">WhatsApp</Label>
              <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+243..." className="bg-muted/10 border-border/15 h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground/60">Instagram</Label>
              <Input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@handle" className="bg-muted/10 border-border/15 h-9 text-sm" />
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2 text-xs font-medium mt-2">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Enregistrer les modifications
        </Button>
      </motion.div>

      {/* Sécurité */}
      <motion.div {...fadeUp(0.2)} className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-muted-foreground/50" /> Sécurité
          </h3>
          <div className="system-line mt-3" />
        </div>

        <div className="space-y-3 max-w-sm">
          <Label className="text-xs text-muted-foreground/60">Changer le mot de passe</Label>
          <Input type="password" placeholder="Nouveau mot de passe" value={newPassword}
            onChange={e => setNewPassword(e.target.value)} className="bg-muted/10 border-border/15 h-9 text-sm" />
          <Input type="password" placeholder="Confirmer" value={confirmNewPassword}
            onChange={e => setConfirmNewPassword(e.target.value)} className="bg-muted/10 border-border/15 h-9 text-sm" />
          <Button variant="outline" size="sm" onClick={handleChangePassword} disabled={changingPassword || !newPassword} className="gap-2 text-xs border-border/20">
            {changingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Changer le mot de passe
          </Button>
        </div>

        <div className="system-line" />

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleSignOutAll} className="gap-2 text-xs border-border/20 text-muted-foreground hover:text-foreground">
            <LogOut className="h-3.5 w-3.5" /> Déconnecter tous les appareils
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteModal(true)} className="gap-2 text-xs">
            <Trash2 className="h-3.5 w-3.5" /> Supprimer le compte
          </Button>
        </div>
      </motion.div>

      {/* Delete confirmation */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Supprimer votre compte ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground/70 leading-relaxed">
            Cette action est irréversible. Toutes vos données seront supprimées définitivement.
          </p>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowDeleteModal(false)} className="text-xs text-muted-foreground">Annuler</Button>
            <Button variant="destructive" size="sm" className="text-xs" onClick={() => {
              toast({ title: "Contactez le support", description: "La suppression de compte nécessite une confirmation par email." });
              setShowDeleteModal(false);
            }}>Confirmer la suppression</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
