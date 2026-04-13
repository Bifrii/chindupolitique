import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, User, Settings, FolderArchive } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { NotificationBell } from "@/components/NotificationBell";
import logo from "@/assets/logo.png";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (user && profile && profile.onboarding_completed !== true && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const initials = user
    ? (profile?.full_name
        ? profile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
        : user.email?.[0]?.toUpperCase() || "?")
    : "?";

  return (
    <SidebarProvider>
      <div className="min-h-dvh flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 max-w-full">
          <header className="h-14 flex items-center justify-between border-b border-border/40 px-3 md:px-5 shrink-0 bg-background/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground shrink-0" />
              <div className="flex items-center gap-2 md:hidden min-w-0">
                <img src={logo} alt="PIM" className="h-6 w-6 shrink-0 opacity-70" />
                <span className="text-sm font-semibold text-foreground/80 tracking-tight truncate">PIM</span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {loading ? (
                <div className="h-9 w-9 rounded-full border border-border/30 bg-muted/20 animate-pulse" />
              ) : user ? (
                <>
                  <NotificationBell />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2 text-sm hover:bg-accent">
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarImage src={profile?.avatar_url || ""} />
                          <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">{initials}</AvatarFallback>
                        </Avatar>
                        <span className="hidden sm:inline max-w-[120px] truncate text-foreground/70">
                          {profile?.full_name || user.email}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => navigate("/profil")}>
                        <User className="h-4 w-4 mr-2" /> Mon profil
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/parametres")}>
                        <Settings className="h-4 w-4 mr-2" /> Paramètres
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/archives")}>
                        <FolderArchive className="h-4 w-4 mr-2" /> Mes archives
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                        <LogOut className="h-4 w-4 mr-2" /> Se déconnecter
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate("/login")}
                  className="text-foreground/60 hover:text-foreground text-sm"
                >
                  Se connecter
                </Button>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-5 lg:p-8 pb-20 md:pb-8">
            {children}
          </main>
        </div>
      </div>
      <MobileBottomNav />
    </SidebarProvider>
  );
}
