import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

function getPasswordStrength(pw: string): { score: number; label: string } {
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

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast({ title: "Erreur", description: "Veuillez entrer votre prénom et nom.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Erreur", description: "Le mot de passe doit contenir au moins 8 caractères.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const { error } = await signUp(email, password, fullName);
    if (error) {
      const msg = error.message === "User already registered"
        ? "Un compte existe déjà avec cet email."
        : error.message;
      toast({ title: "Erreur d'inscription", description: msg, variant: "destructive" });
    } else {
      toast({ title: "Compte créé !", description: "Vérifiez votre email pour confirmer votre inscription." });
      navigate("/login");
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast({ title: "Erreur Google", description: String(error.message || error), variant: "destructive" });
      setGoogleLoading(false);
    }
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
          <h1 className="text-lg font-semibold tracking-tight text-foreground/90">PIM</h1>
          <p className="system-text text-[10px] text-muted-foreground/50 tracking-widest uppercase mt-1">
            Political Image Manager
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border/15 bg-card/30 backdrop-blur-sm p-6 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-base font-semibold tracking-tight text-foreground">Créer votre compte</h2>
            <p className="text-xs text-muted-foreground/60">Gérez votre image politique avec l'IA</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                <Input placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  className="pl-9 bg-muted/10 border-border/15 h-10 text-sm" required />
              </div>
              <Input placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)}
                className="bg-muted/10 border-border/15 h-10 text-sm" required />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
              <Input type="email" placeholder="Adresse email" value={email}
                onChange={(e) => setEmail(e.target.value)} className="pl-9 bg-muted/10 border-border/15 h-10 text-sm" required />
            </div>
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                <Input type={showPassword ? "text" : "password"} placeholder="Mot de passe (min. 8 car.)"
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
              {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Création...</> : "Créer mon compte"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/10" /></div>
            <div className="relative flex justify-center">
              <span className="system-text text-[10px] bg-card/30 px-3 text-muted-foreground/40">ou</span>
            </div>
          </div>

          <Button variant="outline" className="w-full gap-2 h-10 text-sm border-border/15 hover:bg-muted/10 text-muted-foreground hover:text-foreground" onClick={handleGoogle} disabled={googleLoading}>
            {googleLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            )}
            Continuer avec Google
          </Button>
        </div>

        <div className="text-center mt-6">
          <Link to="/login" className="text-xs text-muted-foreground/50 hover:text-foreground transition-colors">
            Déjà un compte ? <span className="text-foreground/70 font-medium">Se connecter</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
