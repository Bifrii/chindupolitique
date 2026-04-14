import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Clock, Bot, Download, Trash2, Pencil,
  Send, Loader2, ChevronLeft, ChevronRight, Filter, Facebook, Twitter,
  MessageSquare, Camera
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, isBefore, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackFeatureUsed } from "@/lib/operationalTracking";

interface Post {
  id: string;
  content: string;
  platforms: string[];
  scheduled_at: string;
  category: string;
  status: string;
  ai_score: number | null;
  ai_optimized_content: any;
  created_at: string;
}

const PLATFORMS = [
  { id: "twitter", label: "Twitter/X", maxChars: 280, icon: Twitter, color: "bg-blue-500" },
  { id: "facebook", label: "Facebook", maxChars: 63206, icon: Facebook, color: "bg-blue-700" },
  { id: "whatsapp", label: "WhatsApp", maxChars: 65536, icon: MessageSquare, color: "bg-green-500" },
  { id: "instagram", label: "Instagram", maxChars: 2200, icon: Camera, color: "bg-pink-500" },
];

const CATEGORIES = [
  { id: "crise", label: "Crise", color: "bg-red-500/15 text-red-400 border-red-500/20" },
  { id: "image", label: "Image", color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  { id: "replique", label: "Réplique", color: "bg-orange-500/15 text-orange-400 border-orange-500/20" },
  { id: "viral", label: "Viral", color: "bg-purple-500/15 text-purple-400 border-purple-500/20" },
  { id: "tendance", label: "Tendance", color: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
];

const STATUS_BADGES: Record<string, string> = {
  planifie: "bg-primary/15 text-primary border-primary/20",
  publie: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  echoue: "bg-red-500/15 text-red-400 border-red-500/20",
};

const STATUS_LABELS: Record<string, string> = {
  planifie: "Planifié",
  publie: "Publié",
  echoue: "Échoué",
};

function getCountdown(scheduledAt: string): string {
  const diff = new Date(scheduledAt).getTime() - Date.now();
  if (diff <= 0) return "Dépassé";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}j ${h % 24}h`;
  return `${h}h ${m}min`;
}

export default function Planificateur() {
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [detailPost, setDetailPost] = useState<Post | null>(null);

  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("19:00");
  const [category, setCategory] = useState("general");
  const [optimizing, setOptimizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  const [timingPlatform, setTimingPlatform] = useState("twitter");
  const [timingCategory, setTimingCategory] = useState("crise");
  const [timingLoading, setTimingLoading] = useState(false);
  const [timingResult, setTimingResult] = useState<any>(null);

  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("posts_planifies" as any).select("*").eq("user_id", user.id)
      .order("scheduled_at", { ascending: true });
    if (!error && data) setPosts(data as any);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
    const channel = supabase
      .channel("posts-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts_planifies" }, () => { fetchPosts(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPosts]);

  useEffect(() => {
    const interval = setInterval(() => setPosts(p => [...p]), 60000);
    return () => clearInterval(interval);
  }, []);

  const resetForm = () => {
    setContent(""); setSelectedPlatforms([]); setScheduledDate("");
    setScheduledTime("19:00"); setCategory("general"); setAiResult(null); setEditingPost(null);
  };

  const openCreateModal = () => { resetForm(); setShowModal(true); };

  const openEditModal = (post: Post) => {
    setEditingPost(post); setContent(post.content); setSelectedPlatforms(post.platforms);
    setScheduledDate(format(parseISO(post.scheduled_at), "yyyy-MM-dd"));
    setScheduledTime(format(parseISO(post.scheduled_at), "HH:mm"));
    setCategory(post.category); setAiResult(post.ai_optimized_content); setShowModal(true); setDetailPost(null);
  };

  const handleOptimize = async () => {
    if (!content.trim() || selectedPlatforms.length === 0) {
      toast({ title: "Erreur", description: "Ajoutez du contenu et sélectionnez au moins une plateforme.", variant: "destructive" }); return;
    }
    setOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("optimize-post", { body: { content, platforms: selectedPlatforms, category, type: "optimize" } });
      if (error) throw error;
      setAiResult(data);
      if (data.overall_score) toast({ title: "Optimisation terminée", description: `Score d'engagement prévu : ${data.overall_score}/100` });
    } catch (e: any) { toast({ title: "Erreur IA", description: e.message, variant: "destructive" }); }
    finally { setOptimizing(false); }
  };

  const handleSave = async () => {
    if (!content.trim() || !scheduledDate || selectedPlatforms.length === 0) {
      toast({ title: "Erreur", description: "Remplissez tous les champs obligatoires.", variant: "destructive" }); return;
    }
    setSaving(true);
    trackFeatureUsed("planificateur_save");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
    const payload = { user_id: user.id, content, platforms: selectedPlatforms, scheduled_at: scheduledAt, category, ai_score: aiResult?.overall_score || null, ai_optimized_content: aiResult || null, status: "planifie" };
    try {
      if (editingPost) {
        const { error } = await supabase.from("posts_planifies" as any).update(payload as any).eq("id", editingPost.id);
        if (error) throw error; toast({ title: "Post mis à jour" });
      } else {
        const { error } = await supabase.from("posts_planifies" as any).insert(payload as any);
        if (error) throw error; toast({ title: "Post planifié !" });
      }
      setShowModal(false); resetForm();
    } catch (e: any) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("posts_planifies" as any).delete().eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Post supprimé" }); setDetailPost(null); }
  };

  const [publishing, setPublishing] = useState<string | null>(null);

  const handlePublishNow = async (post: Post) => {
    const hasTwitter = post.platforms.includes("twitter");
    if (hasTwitter) {
      setPublishing(post.id);
      try {
        let tweetContent = post.content;
        if (post.ai_optimized_content?.optimized?.twitter?.text) {
          tweetContent = post.ai_optimized_content.optimized.twitter.text;
          if (post.ai_optimized_content.optimized.twitter.hashtags) {
            tweetContent += " " + post.ai_optimized_content.optimized.twitter.hashtags.map((h: string) => `#${h}`).join(" ");
          }
        }
        const { data, error } = await supabase.functions.invoke("publish-tweet", { body: { postId: post.id, content: tweetContent.slice(0, 280) } });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast({ title: "Publié sur Twitter !", description: `Tweet ID: ${data.tweet_id}` });
      } catch (e: any) { toast({ title: "Erreur de publication", description: e.message, variant: "destructive" }); }
      finally { setPublishing(null); }
    } else {
      const { error } = await supabase.from("posts_planifies" as any).update({ status: "publie" } as any).eq("id", post.id);
      if (!error) toast({ title: "Marqué comme publié !" });
    }
  };

  const handleTiming = async () => {
    setTimingLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("optimize-post", { body: { content: "", platforms: [timingPlatform], category: timingCategory, type: "timing" } });
      if (error) throw error; setTimingResult(data);
    } catch (e: any) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
    finally { setTimingLoading(false); }
  };

  const exportCSV = () => {
    const rows = filteredHistory.map(p => [
      format(parseISO(p.scheduled_at), "dd/MM/yyyy HH:mm"), p.platforms.join(", "),
      `"${p.content.replace(/"/g, '""').slice(0, 100)}"`, p.category, STATUS_LABELS[p.status] || p.status,
    ]);
    const csv = "Date,Plateformes,Aperçu,Catégorie,Statut\n" + rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "publications_pim.csv"; a.click();
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1;

  const getPostsForDay = (day: Date) => posts.filter(p => isSameDay(parseISO(p.scheduled_at), day));
  const upcomingPosts = posts.filter(p => p.status === "planifie" && !isBefore(parseISO(p.scheduled_at), new Date()));
  const filteredHistory = posts.filter(p => {
    if (filterPlatform !== "all" && !p.platforms.includes(filterPlatform)) return false;
    if (filterCategory !== "all" && p.category !== filterCategory) return false;
    return true;
  });

  const getPlatformIcon = (id: string) => {
    const p = PLATFORMS.find(pl => pl.id === id);
    return p ? <p.icon className="h-3 w-3" /> : null;
  };

  const getPlatformColor = (id: string) => PLATFORMS.find(p => p.id === id)?.color || "bg-muted";

  const inputClass = "bg-muted/30 border-border/30 text-sm rounded-xl focus:border-border/60 focus:ring-0 placeholder:text-muted-foreground/50 transition-colors";

  return (
    <div className="max-w-6xl mx-auto space-y-10 md:space-y-14 py-4 md:py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">Planificateur</h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-md leading-relaxed">Planifiez et optimisez vos publications multi-plateformes.</p>
          <div className="system-line mt-6" />
        </div>
        <Button onClick={openCreateModal} variant="ghost"
          className="font-medium w-full sm:w-auto h-10 px-6 rounded-xl bg-foreground/10 hover:bg-foreground/15 text-foreground border border-border/30 gap-2">
          <Plus className="h-4 w-4 text-muted-foreground" /> Planifier
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar + Queue */}
        <div className="lg:col-span-3 space-y-6">
          {/* Calendar */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.5 }}
            className="border border-border/20 rounded-xl p-5 md:p-6 hover:border-border/30 transition-colors">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium capitalize text-foreground">
                  {format(currentMonth, "MMMM yyyy", { locale: fr })}
                </span>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="hidden md:flex items-center gap-3">
                {PLATFORMS.map(p => (
                  <div key={p.id} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className={`h-2 w-2 rounded-full ${p.color}`} />{p.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-7 gap-px text-center hidden md:grid">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => (
                <div key={d} className="text-[10px] font-medium text-muted-foreground py-2 uppercase tracking-wider">{d}</div>
              ))}
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[76px] bg-muted/5 rounded-lg" />
              ))}
              {days.map(day => {
                const dayPosts = getPostsForDay(day);
                return (
                  <div key={day.toISOString()}
                    className={`min-h-[76px] p-1.5 rounded-lg border transition-colors ${
                      isToday(day) ? "border-primary/30 bg-primary/5" : "border-border/10 hover:border-border/30"
                    }`}>
                    <div className={`text-[10px] font-medium mb-1 ${isToday(day) ? "text-primary" : "text-muted-foreground"}`}>
                      {format(day, "d")}
                    </div>
                    <div className="space-y-0.5">
                      {dayPosts.slice(0, 3).map(post => (
                        <button key={post.id} onClick={() => setDetailPost(post)}
                          className={`w-full text-left text-[9px] px-1 py-0.5 rounded truncate flex items-center gap-1 hover:opacity-80 transition-opacity ${
                            post.platforms[0] ? getPlatformColor(post.platforms[0]) + " text-white" : "bg-muted"
                          }`}>
                          {format(parseISO(post.scheduled_at), "HH:mm")} {post.content.slice(0, 12)}
                        </button>
                      ))}
                      {dayPosts.length > 3 && <span className="text-[9px] text-muted-foreground">+{dayPosts.length - 3}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Queue */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
            className="border border-border/20 rounded-xl p-5 md:p-6 hover:border-border/30 transition-colors">
            <p className="system-text tracking-widest mb-5 flex items-center gap-2">
              <Clock className="h-3 w-3" /> File d'attente
            </p>
            {upcomingPosts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-10">Aucun post planifié à venir</p>
            ) : (
              <div className="space-y-2">
                {upcomingPosts.map(post => (
                  <motion.div key={post.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-border/15 hover:border-border/30 transition-colors gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground/80 truncate">{post.content.slice(0, 100)}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <div className="flex gap-1">
                          {post.platforms.map(pl => (
                            <span key={pl} className={`h-4 w-4 rounded-full ${getPlatformColor(pl)} flex items-center justify-center text-white`}>
                              {getPlatformIcon(pl)}
                            </span>
                          ))}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">{format(parseISO(post.scheduled_at), "dd/MM HH:mm")}</span>
                        <Badge variant="outline" className={`text-[10px] font-normal ${STATUS_BADGES[post.status] || ""}`}>
                          {STATUS_LABELS[post.status] || post.status}
                        </Badge>
                        <span className="text-[10px] text-primary/70 font-mono">{getCountdown(post.scheduled_at)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEditModal(post)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(post.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handlePublishNow(post)} disabled={publishing === post.id}
                        className="h-8 text-xs text-muted-foreground hover:text-foreground px-3 border border-border/20 rounded-lg">
                        {publishing === post.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                        Publier
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Timing Assistant */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }}
          className="border border-border/20 rounded-xl p-5 hover:border-border/30 transition-colors h-fit">
          <p className="system-text tracking-widest mb-5">Meilleur moment</p>
          <div className="space-y-4">
            <div>
              <Label className="system-text text-[10px]">Plateforme</Label>
              <Select value={timingPlatform} onValueChange={setTimingPlatform}>
                <SelectTrigger className={`${inputClass} mt-1.5 h-9`}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border/30">
                  {PLATFORMS.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="system-text text-[10px]">Catégorie</Label>
              <Select value={timingCategory} onValueChange={setTimingCategory}>
                <SelectTrigger className={`${inputClass} mt-1.5 h-9`}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border/30">
                  {CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" className="w-full h-9 rounded-xl bg-foreground/10 hover:bg-foreground/15 text-foreground border border-border/30 text-xs font-medium gap-2"
              onClick={handleTiming} disabled={timingLoading}>
              {timingLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5 text-muted-foreground" />}
              Analyser
            </Button>

            <AnimatePresence>
              {timingResult?.slots && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 pt-2">
                  {timingResult.slots.map((s: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg border border-border/15 hover:border-border/30 transition-colors">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-foreground/80">{s.day}</span>
                        <span className="text-[10px] text-primary/70 font-mono">{s.score}/100</span>
                      </div>
                      <p className="text-[10px] text-primary/60 mt-0.5">{s.time}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{s.reason}</p>
                    </div>
                  ))}
                  {timingResult.summary && <p className="text-[10px] text-muted-foreground italic leading-relaxed">{timingResult.summary}</p>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* History */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
        className="border border-border/20 rounded-xl p-5 md:p-6 hover:border-border/30 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <p className="system-text tracking-widest">Historique</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterPlatform} onValueChange={setFilterPlatform}>
              <SelectTrigger className={`w-[130px] h-8 text-[10px] ${inputClass}`}><SelectValue placeholder="Plateforme" /></SelectTrigger>
              <SelectContent className="bg-card border-border/30">
                <SelectItem value="all">Toutes</SelectItem>
                {PLATFORMS.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className={`w-[120px] h-8 text-[10px] ${inputClass}`}><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent className="bg-card border-border/30">
                <SelectItem value="all">Toutes</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={exportCSV} className="h-8 text-[10px] text-muted-foreground hover:text-foreground px-3 border border-border/20 rounded-lg gap-1">
              <Download className="h-3 w-3" /> CSV
            </Button>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-12">Aucune publication</p>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/15 hover:bg-transparent">
                    <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Date</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Plateforme</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Aperçu</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Catégorie</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map(post => (
                    <TableRow key={post.id} className="border-border/10 hover:bg-muted/10 cursor-pointer" onClick={() => setDetailPost(post)}>
                      <TableCell className="text-xs text-muted-foreground font-mono">{format(parseISO(post.scheduled_at), "dd/MM/yy HH:mm")}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {post.platforms.map(pl => (
                            <span key={pl} className={`h-4 w-4 rounded-full ${getPlatformColor(pl)} flex items-center justify-center text-white`}>
                              {getPlatformIcon(pl)}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-foreground/70 max-w-[200px] truncate">{post.content.slice(0, 80)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] font-normal ${CATEGORIES.find(c => c.id === post.category)?.color || ""}`}>
                          {CATEGORIES.find(c => c.id === post.category)?.label || post.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] font-normal ${STATUS_BADGES[post.status] || ""}`}>
                          {STATUS_LABELS[post.status] || post.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="md:hidden space-y-2">
              {filteredHistory.map(post => (
                <div key={post.id} className="border border-border/15 rounded-xl p-4 space-y-2 hover:border-border/30 transition-colors" onClick={() => setDetailPost(post)}>
                  <p className="text-sm text-foreground/80 truncate">{post.content.slice(0, 80)}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex gap-1">
                      {post.platforms.map(pl => (
                        <span key={pl} className={`h-4 w-4 rounded-full ${getPlatformColor(pl)} flex items-center justify-center text-white`}>
                          {getPlatformIcon(pl)}
                        </span>
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">{format(parseISO(post.scheduled_at), "dd/MM HH:mm")}</span>
                    <Badge variant="outline" className={`text-[10px] font-normal ${STATUS_BADGES[post.status] || ""}`}>{STATUS_LABELS[post.status] || post.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-border/20 bg-background">
          <DialogHeader>
            <DialogTitle className="text-base font-medium">{editingPost ? "Modifier le post" : "Planifier un post"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <Label className="system-text text-[10px]">Contenu</Label>
              <Textarea placeholder="Contenu du post…" value={content} onChange={(e) => setContent(e.target.value)}
                className={`min-h-[120px] mt-2 resize-none leading-relaxed ${inputClass}`} />
              <div className="flex gap-3 mt-1.5 flex-wrap">
                {selectedPlatforms.map(pl => {
                  const p = PLATFORMS.find(x => x.id === pl);
                  if (!p) return null;
                  const over = content.length > p.maxChars;
                  return <span key={pl} className={`text-[10px] font-mono ${over ? "text-destructive" : "text-muted-foreground"}`}>{p.label}: {content.length}/{p.maxChars}</span>;
                })}
              </div>
            </div>

            <div>
              <Label className="system-text text-[10px]">Plateformes</Label>
              <div className="flex gap-4 mt-2 flex-wrap">
                {PLATFORMS.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    <Checkbox checked={selectedPlatforms.includes(p.id)}
                      onCheckedChange={(checked) => setSelectedPlatforms(prev => checked ? [...prev, p.id] : prev.filter(x => x !== p.id))} />
                    <p.icon className="h-3.5 w-3.5" /> {p.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="system-text text-[10px]">Date</Label>
                <Input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className={`mt-2 h-10 ${inputClass}`} />
              </div>
              <div>
                <Label className="system-text text-[10px]">Heure</Label>
                <Input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className={`mt-2 h-10 ${inputClass}`} />
              </div>
            </div>

            <div>
              <Label className="system-text text-[10px]">Catégorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className={`mt-2 h-10 ${inputClass}`}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border/30">
                  {CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Button variant="ghost" className="w-full h-10 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground border border-border/20 text-xs font-medium gap-2"
              onClick={handleOptimize} disabled={optimizing}>
              {optimizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5 text-muted-foreground" />}
              Optimiser avec l'IA
            </Button>

            <AnimatePresence>
              {aiResult?.optimized && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="space-y-3 p-4 rounded-xl border border-border/15">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-foreground/80">Résultats</span>
                    {aiResult.overall_score && <span className="text-[10px] text-primary/70 font-mono">Score: {aiResult.overall_score}/100</span>}
                  </div>
                  {Object.entries(aiResult.optimized).map(([key, val]: [string, any]) => (
                    <div key={key} className="p-3 rounded-lg border border-border/10 hover:border-border/25 transition-colors">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`h-4 w-4 rounded-full ${getPlatformColor(key)} flex items-center justify-center text-white`}>
                          {getPlatformIcon(key)}
                        </span>
                        <span className="text-[10px] font-medium text-foreground/70 capitalize">{key}</span>
                        {val.score && <span className="text-[10px] text-primary/60 font-mono">{val.score}/100</span>}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{val.text}</p>
                      {val.hashtags && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {val.hashtags.map((h: string, i: number) => <span key={i} className="text-[10px] text-primary/50">#{h}</span>)}
                        </div>
                      )}
                    </div>
                  ))}
                  {aiResult.best_time && (
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Meilleur moment : {aiResult.best_time.day} à {aiResult.best_time.time} — {aiResult.best_time.reason}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowModal(false)} className="text-xs text-muted-foreground">Annuler</Button>
            <Button onClick={handleSave} disabled={saving} variant="ghost"
              className="h-9 px-6 rounded-xl bg-foreground/10 hover:bg-foreground/15 text-foreground border border-border/30 text-xs font-medium gap-2">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Planifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={!!detailPost} onOpenChange={() => setDetailPost(null)}>
        <DialogContent className="border-border/20 bg-background">
          <DialogHeader>
            <DialogTitle className="text-base font-medium">Détail du post</DialogTitle>
          </DialogHeader>
          {detailPost && (
            <div className="space-y-4">
              <p className="text-sm text-foreground/80 leading-relaxed">{detailPost.content}</p>
              <div className="flex gap-2 flex-wrap">
                {detailPost.platforms.map(pl => (
                  <Badge key={pl} variant="outline" className={`text-[10px] font-normal ${getPlatformColor(pl)} text-white border-0`}>
                    {PLATFORMS.find(p => p.id === pl)?.label || pl}
                  </Badge>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground font-mono">
                {format(parseISO(detailPost.scheduled_at), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
              </p>
              <Badge variant="outline" className={`text-[10px] font-normal ${STATUS_BADGES[detailPost.status]}`}>
                {STATUS_LABELS[detailPost.status] || detailPost.status}
              </Badge>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => detailPost && openEditModal(detailPost)} className="text-xs text-muted-foreground hover:text-foreground gap-1">
              <Pencil className="h-3 w-3" /> Modifier
            </Button>
            <Button variant="ghost" onClick={() => detailPost && handleDelete(detailPost.id)} className="text-xs text-destructive/60 hover:text-destructive gap-1">
              <Trash2 className="h-3 w-3" /> Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
