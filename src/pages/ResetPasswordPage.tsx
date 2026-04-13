import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

function getPasswordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score += 25;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 25;
  if (/\d/.test(pw)) score += 25;
  if (/[^a-zA-Z0-9]/.test(pw)) score += 25;
  if (score <= 25) return { score, label: "Faible" };
  if (score <= 50) return { score, label: "Moyen" };
  if (score <= 75) return { score, label: "Bon" };
  return { score, label: "Fort" };
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const strength = getPasswordStrength(password);

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setHasSession(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await updatePassword(password);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setDone(true);
      setTimeout(() => navigate("/"), 2000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-[360px]"
      >
        {/* Brand */}
        <div className="flex flex-col items-center mb-12">
          <img src={logo} alt="PIM Logo" className="h-10 w-10 mb-4 opacity-70" />
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border/15 bg-card/30 backdrop-blur-sm p-6 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-base font-semibold tracking-tight text-foreground">Réinitialiser le mot de passe</h2>
            <p className="text-xs text-muted-foreground/60">Choisissez un nouveau mot de passe sécurisé</p>
          </div>

          {hasSession === false ? (
            <div className="text-center py-6 space-y-3">
              <AlertTriangle className="h-8 w-8 text-destructive/60 mx-auto" />
              <p className="text-sm text-foreground/80">Ce lien est invalide ou a expiré.</p>
              <Link to="/forgot-password">
                <Button variant="outline" size="sm" className="mt-2 border-border/15 text-xs">Demander un nouveau lien</Button>
              </Link>
            </div>
          ) : done ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle className="h-8 w-8 text-primary/70 mx-auto" />
              <p className="text-sm text-foreground/80">Mot de passe réinitialisé avec succès !</p>
              <p className="system-text text-[10px] text-muted-foreground/40">Redirection…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                  <Input type={showPassword ? "text" : "password"} placeholder="Nouveau mot de passe"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9 bg-muted/10 border-border/15 h-10 text-sm" required minLength={8} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {password && (
                  <div className="mt-2 space-y-1">
                    <Progress value={strength.score} className="h-0.5" />
                    <p className="system-text text-[10px] text-muted-foreground/50">Force : <span className="text-foreground/60 font-medium">{strength.label}</span></p>
                  </div>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                <Input type="password" placeholder="Confirmer le mot de passe"
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9 bg-muted/10 border-border/15 h-10 text-sm" required />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-[11px] text-destructive/80">Les mots de passe ne correspondent pas</p>
              )}
              <Button type="submit" className="w-full h-10 text-sm font-medium" disabled={loading}>
                {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Réinitialisation...</> : "Réinitialiser"}
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
