import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { resetPassword } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(email);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
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
            <h2 className="text-base font-semibold tracking-tight text-foreground">Mot de passe oublié</h2>
            <p className="text-xs text-muted-foreground/60">Recevez un lien de réinitialisation par email</p>
          </div>

          {sent ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle className="h-8 w-8 text-primary/70 mx-auto" />
              <p className="text-sm text-foreground/80">Email envoyé à <strong className="text-foreground">{email}</strong></p>
              <p className="text-[11px] text-muted-foreground/50">Vérifiez votre boîte de réception et vos spams</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                <Input type="email" placeholder="Adresse email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 bg-muted/10 border-border/15 h-10 text-sm" required />
              </div>
              <Button type="submit" className="w-full h-10 text-sm font-medium" disabled={loading}>
                {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Envoi...</> : "Envoyer le lien"}
              </Button>
            </form>
          )}
        </div>

        <div className="text-center mt-6">
          <Link to="/login" className="text-xs text-muted-foreground/50 hover:text-foreground transition-colors">
            Retour à la connexion
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
