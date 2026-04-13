import { useState, useEffect, useCallback } from "react";
import { Bell, AlertTriangle, TrendingUp, Sparkles, Check, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  region: string | null;
  is_read: boolean;
  created_at: string;
}

const typeConfig: Record<string, { icon: typeof AlertTriangle; color: string; label: string }> = {
  crisis: { icon: AlertTriangle, color: "text-destructive", label: "Crise" },
  trend: { icon: TrendingUp, color: "text-primary", label: "Tendance" },
  opportunity: { icon: Sparkles, color: "text-success", label: "Opportunité" },
  info: { icon: Bell, color: "text-muted-foreground", label: "Info" },
};

export function NotificationBell() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifications(data);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
          
          // Show browser notification if permitted
          if (Notification.permission === "granted") {
            const config = typeConfig[newNotif.type] || typeConfig.info;
            new Notification(`${config.label}: ${newNotif.title}`, {
              body: newNotif.message,
              icon: "/favicon.ico",
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAsRead = async (id: string) => {
    await (supabase as any).from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await (supabase as any).from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const deleteNotification = async (id: string) => {
    await (supabase as any).from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const generateNotifications = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-notifications");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Alertes générées", description: `${data.notifications_sent || 0} notifications envoyées.` });
      await fetchNotifications();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const requestPushPermission = async () => {
    if (!("Notification" in window)) {
      toast({ title: "Non supporté", description: "Votre navigateur ne supporte pas les notifications.", variant: "destructive" });
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      toast({ title: "Notifications activées", description: "Vous recevrez des alertes en temps réel." });
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (!user) return null;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins}min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Il y a ${diffDays}j`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 md:w-96">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="font-display font-semibold text-sm">Notifications</span>
          <div className="flex gap-1">
            {Notification.permission !== "granted" && (
              <Button variant="ghost" size="sm" onClick={requestPushPermission} className="text-xs h-7 px-2">
                <Bell className="h-3 w-3 mr-1" /> Activer
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={generateNotifications} disabled={generating} className="text-xs h-7 px-2">
              {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
              Scanner
            </Button>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7 px-2">
                <Check className="h-3 w-3 mr-1" /> Tout lire
              </Button>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Aucune notification</p>
              <p className="text-xs mt-1">Cliquez "Scanner" pour générer des alertes</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const config = typeConfig[notif.type] || typeConfig.info;
              const Icon = config.icon;
              return (
                <DropdownMenuItem
                  key={notif.id}
                  className={`flex items-start gap-3 p-3 cursor-pointer ${!notif.is_read ? "bg-secondary/30" : ""}`}
                  onClick={() => markAsRead(notif.id)}
                >
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{notif.title}</span>
                      {!notif.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notif.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">{formatTime(notif.created_at)}</span>
                      {notif.region && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1">{notif.region}</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </DropdownMenuItem>
              );
            })
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
