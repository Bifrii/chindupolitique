import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-4"
      >
        <h1 className="text-6xl font-semibold tracking-tight text-foreground/80">404</h1>
        <div className="system-line w-32 mx-auto" />
        <p className="text-sm text-muted-foreground">Page introuvable</p>
        <a
          href="/"
          className="inline-block mt-4 px-6 py-2.5 rounded-lg bg-muted hover:bg-muted/80 text-sm text-foreground/70 hover:text-foreground transition-colors"
        >
          Retour à l'accueil
        </a>
        <p className="system-text mt-8">Route non résolue : {location.pathname}</p>
      </motion.div>
    </div>
  );
};

export default NotFound;
