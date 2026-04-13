import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          setError(sessionError.message);
          return;
        }

        if (session) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("onboarding_completed")
            .eq("id", session.user.id)
            .single();

          if (profile?.onboarding_completed) {
            navigate("/", { replace: true });
          } else {
            navigate("/onboarding", { replace: true });
          }
        } else {
          const timeout = setTimeout(() => {
            setError("Aucune session trouvée. Veuillez réessayer.");
          }, 5000);

          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
              if (event === "SIGNED_IN" && newSession) {
                clearTimeout(timeout);
                subscription.unsubscribe();

                const { data: profile } = await supabase
                  .from("profiles")
                  .select("onboarding_completed")
                  .eq("id", newSession.user.id)
                  .single();

                if (profile?.onboarding_completed) {
                  navigate("/", { replace: true });
                } else {
                  navigate("/onboarding", { replace: true });
                }
              }
            }
          );

          return () => {
            clearTimeout(timeout);
            subscription.unsubscribe();
          };
        }
      } catch (e: any) {
        setError(e.message || "Erreur inattendue lors de la connexion.");
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center flex-col gap-4 p-6 bg-background">
        <img src={logo} alt="PIM" className="h-12 w-12 opacity-80" />
        <p className="text-destructive text-base font-semibold text-center">Erreur de connexion</p>
        <p className="text-sm text-muted-foreground text-center max-w-xs">{error}</p>
        <button
          onClick={() => navigate("/login", { replace: true })}
          className="mt-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Retour à la connexion
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center flex-col gap-4 bg-background">
      <img src={logo} alt="PIM" className="h-12 w-12 opacity-80" />
      <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">Connexion en cours...</p>
    </div>
  );
}
