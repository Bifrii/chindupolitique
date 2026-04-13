import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, History, BarChart3, Sparkles } from "lucide-react";

interface PremiumLoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const features = [
  { icon: Zap, label: "Générations illimitées" },
  { icon: History, label: "Historique de contenu" },
  { icon: BarChart3, label: "Analyse avancée" },
  { icon: Sparkles, label: "Stratège IA personnalisé" },
];

export function PremiumLoginModal({ open, onOpenChange }: PremiumLoginModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center items-center space-y-3">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-muted/40 border border-border/20">
            <Zap className="h-5 w-5 text-foreground/60" />
          </div>
          <DialogTitle className="text-base">
            Débloquez tout le potentiel de PIM
          </DialogTitle>
          <DialogDescription className="text-xs">
            Vous avez utilisé vos essais gratuits. Créez un compte pour continuer.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 my-2">
          {features.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 rounded-lg border border-border/15 bg-muted/20 p-3"
            >
              <Icon className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
              <span className="text-xs text-foreground/70">{label}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-1">
          <Button
            className="w-full font-medium text-sm h-10"
            onClick={() => {
              onOpenChange(false);
              navigate("/register");
            }}
          >
            Créer un compte gratuit
          </Button>
          <Button
            variant="ghost"
            className="w-full text-xs text-muted-foreground/60 hover:text-foreground"
            onClick={() => {
              onOpenChange(false);
              navigate("/login");
            }}
          >
            J'ai déjà un compte
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
