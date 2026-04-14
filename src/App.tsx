import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import AnalyzeContent from "./pages/AnalyzeContent";
import PoliticalRadar from "./pages/PoliticalRadar";
import AIStrategist from "./pages/AIStrategist";
import ContentGenerator from "./pages/ContentGenerator";
import VeilleTwitter from "./pages/VeilleTwitter";
import Planificateur from "./pages/Planificateur";
import Archives from "./pages/Archives";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import OnboardingPage from "./pages/OnboardingPage";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";

const queryClient = new QueryClient();

function RouteLoader() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin h-8 w-8 border-2 border-muted-foreground/30 border-t-foreground/60 rounded-full" />
        <p className="text-muted-foreground text-xs system-text">Initialisation…</p>
      </div>
    </div>
  );
}

function RequireAuth({
  children,
  allowIncompleteOnboarding = false,
}: {
  children: React.ReactNode;
  allowIncompleteOnboarding?: boolean;
}) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <RouteLoader />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowIncompleteOnboarding && profile && profile.onboarding_completed !== true) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="*"
              element={
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/analyser" element={<AnalyzeContent />} />
                    <Route path="/radar" element={<PoliticalRadar />} />
                    <Route path="/stratege" element={<AIStrategist />} />
                    <Route path="/generer" element={<ContentGenerator />} />
                    <Route
                      path="/onboarding"
                      element={
                        <RequireAuth allowIncompleteOnboarding>
                          <OnboardingPage />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/veille"
                      element={
                        <RequireAuth>
                          <VeilleTwitter />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/planificateur"
                      element={
                        <RequireAuth>
                          <Planificateur />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/archives"
                      element={
                        <RequireAuth>
                          <Archives />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/parametres"
                      element={
                        <RequireAuth>
                          <SettingsPage />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/profil"
                      element={
                        <RequireAuth>
                          <ProfilePage />
                        </RequireAuth>
                      }
                    />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AppLayout>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
