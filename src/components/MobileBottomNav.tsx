import { Home, Swords, Bot, Radio, CalendarDays } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useLocation } from "react-router-dom";

const items = [
  { icon: Home, label: "Accueil", path: "/" },
  { icon: Swords, label: "Analyser", path: "/analyser" },
  { icon: Bot, label: "Stratège", path: "/stratege" },
  { icon: Radio, label: "Veille", path: "/veille" },
  { icon: CalendarDays, label: "Planifier", path: "/planificateur" },
];

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/90 backdrop-blur-xl border-t border-border/30" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around h-14 px-1">
        {items.map((item) => {
          const isActive = item.path === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
