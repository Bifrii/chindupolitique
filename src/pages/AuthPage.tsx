import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Erreur de connexion", description: error.message, variant: "destructive" });
      } else {
        navigate("/");
      }
    } else {
      if (!fullName.trim()) {
        toast({ title: "Erreur", description: "Veuillez entrer votre nom complet.", variant: "destructive" });
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast({ title: "Erreur d'inscription", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Compte créé !", description: "Vous êtes maintenant connecté." });
        navigate("/");
      }
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
          <h1 className="text-lg font-semibold tracking-tight text-foreground/90">PIM</h1>
          <p className="system-text text-[10px] text-muted-foreground/50 tracking-widest uppercase mt-1">
            Political Image Manager
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border/15 bg-card/30 backdrop-blur-sm p-6 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {isLogin ? "Connexion" : "Créer un compte"}
            </h2>
            <p className="text-xs text-muted-foreground/60">
              {isLogin
                ? "Accédez à votre espace stratégique"
                : "Gérez votre image politique avec l'IA"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                <Input
                  placeholder="Nom complet" value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-9 bg-muted/10 border-border/15 h-10 text-sm"
                />
              </div>
            )}
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
                type="password" placeholder="Mot de passe" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 bg-muted/10 border-border/15 h-10 text-sm" required minLength={6}
              />
            </div>
            <Button type="submit" className="w-full h-10 text-sm font-medium" disabled={loading}>
              {loading ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Chargement…</>
              ) : isLogin ? "Se connecter" : "Créer mon compte"}
            </Button>
          </form>

          <div className="text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              {isLogin
                ? <>Pas encore de compte ? <span className="text-foreground/70 font-medium">Inscrivez-vous</span></>
                : <>Déjà un compte ? <span className="text-foreground/70 font-medium">Connectez-vous</span></>}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
