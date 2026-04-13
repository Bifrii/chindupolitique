import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

const AUTH_ERROR_MAP: Record<string, string> = {
  "Email not confirmed": "Votre email n'a pas encore été confirmé. Vérifiez votre boîte de réception.",
  "Invalid login credentials": "Identifiants incorrects. Vérifiez votre email et mot de passe.",
  "Email rate limit exceeded": "Trop de tentatives. Veuillez réessayer plus tard.",
  "User not found": "Aucun compte trouvé avec cet email.",
  "Too many requests": "Trop de requêtes. Veuillez patienter quelques instants.",
};

function translateAuthError(msg: string): string {
  return AUTH_ERROR_MAP[msg] || msg;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: "Erreur de connexion", description: translateAuthError(error.message), variant: "destructive" });
    } else {
      navigate("/");
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
            <h2 className="text-base font-semibold tracking-tight text-foreground">Connexion</h2>
            <p className="text-xs text-muted-foreground/60">Accédez à votre espace stratégique</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
              <Input
                type="email" placeholder="Adresse email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 bg-muted/10 border-border/15 h-10 text-sm" required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
              <Input
                type={showPassword ? "text" : "password"} placeholder="Mot de passe"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-9 bg-muted/10 border-border/15 h-10 text-sm" required minLength={8}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors">
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="text-right">
              <Link to="/forgot-password" className="text-[11px] text-muted-foreground/50 hover:text-foreground transition-colors">
                Mot de passe oublié ?
              </Link>
            </div>
            <Button type="submit" className="w-full h-10 text-sm font-medium" disabled={loading}>
              {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Connexion...</> : "Se connecter"}
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
          <Link to="/register" className="text-xs text-muted-foreground/50 hover:text-foreground transition-colors">
            Pas encore de compte ? <span className="text-foreground/70 font-medium">Créer un compte</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
