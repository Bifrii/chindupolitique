import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { FolderArchive, Search, FileText, MessageSquare, Swords, Trash2, Loader2, Megaphone, Bot, Copy, Download } from "lucide-react";
import jsPDF from "jspdf";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchArchives, deleteArchive, type ArchiveEntry } from "@/lib/archiveService";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const typeConfig: Record<string, { label: string; icon: any }> = {
  analyse: { label: "Analyse", icon: Swords },
  contenu: { label: "Contenu", icon: FileText },
  chat: { label: "Conversation", icon: MessageSquare },
  crise: { label: "Crise", icon: FileText },
  image: { label: "Image", icon: FileText },
  attaque: { label: "Attaque", icon: Swords },
  viral: { label: "Viral", icon: Megaphone },
  strategie: { label: "Stratégie", icon: Bot },
};

function extractTextFromContent(content: any, type: string): string[] {
  const lines: string[] = [];
  if (!content) return ["Aucun contenu disponible."];

  if (content.phases && Array.isArray(content.phases)) {
    content.phases.forEach((p: any) => {
      lines.push(`## ${p.title}`);
      if (p.description) lines.push(p.description);
      if (p.post) { lines.push(""); lines.push(`Post: ${p.post}`); }
      lines.push("");
    });
  } else if (content.weeks && Array.isArray(content.weeks)) {
    content.weeks.forEach((w: any) => {
      lines.push(`## ${w.week} — ${w.theme}`);
      if (w.post) lines.push(w.post);
      if (w.action) lines.push(`Action: ${w.action}`);
      lines.push("");
    });
  } else if (content.responses && Array.isArray(content.responses)) {
    content.responses.forEach((r: any) => {
      lines.push(`## ${r.title} (${r.tone})`);
      if (r.text) lines.push(r.text);
      lines.push("");
    });
  } else if (content.posts && Array.isArray(content.posts)) {
    content.posts.forEach((p: any) => {
      lines.push(`## Score ${p.score}/100 — ${p.emotion}`);
      if (p.text) lines.push(p.text);
      lines.push("");
    });
  } else if (content.forces || content.faiblesses || content.reponses) {
    if (content.intention) { lines.push(`Intention: ${content.intention}`); lines.push(""); }
    if (content.forces?.length) { lines.push("Forces:"); content.forces.forEach((f: string) => lines.push(`  ✓ ${f}`)); lines.push(""); }
    if (content.faiblesses?.length) { lines.push("Faiblesses:"); content.faiblesses.forEach((f: string) => lines.push(`  ⚠ ${f}`)); lines.push(""); }
    if (content.reponses?.length) {
      lines.push("Réponses suggérées:");
      content.reponses.forEach((r: any) => { lines.push(`  ${r.title} (${r.tone})`); lines.push(`  ${r.text}`); lines.push(""); });
    }
  } else if (content.question && content.response) {
    lines.push(`Question: ${content.question}`);
    lines.push("");
    lines.push(`Réponse:`);
    lines.push(content.response);
  } else {
    lines.push(JSON.stringify(content, null, 2));
  }
  return lines;
}

function exportArchivePdf(archive: ArchiveEntry) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxW = pageW - margin * 2;
  let y = 20;

  const config = typeConfig[archive.type] || { label: archive.type };

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(archive.title, maxW);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 4;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  const d = new Date(archive.created_at);
  doc.text(`${config.label} — ${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`, margin, y);
  y += 6;
  doc.setTextColor(0);

  if (archive.summary) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    const sumLines = doc.splitTextToSize(archive.summary, maxW);
    doc.text(sumLines, margin, y);
    y += sumLines.length * 5 + 6;
  }

  doc.setDrawColor(200);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const textLines = extractTextFromContent(archive.content, archive.type);

  for (const rawLine of textLines) {
    const isHeading = rawLine.startsWith("## ");
    if (isHeading) { doc.setFont("helvetica", "bold"); doc.setFontSize(12); }
    else { doc.setFont("helvetica", "normal"); doc.setFontSize(10); }
    const text = isHeading ? rawLine.slice(3) : rawLine;
    const wrapped = doc.splitTextToSize(text || " ", maxW);
    const lineH = isHeading ? 6 : 5;
    if (y + wrapped.length * lineH > doc.internal.pageSize.getHeight() - 15) { doc.addPage(); y = 20; }
    doc.text(wrapped, margin, y);
    y += wrapped.length * lineH + (isHeading ? 3 : 1);
  }

  const slug = archive.title.slice(0, 40).replace(/[^a-zA-Z0-9àâéèêëïîôùûüçÀÂÉÈÊËÏÎÔÙÛÜÇ]/g, "_");
  doc.save(`${slug}.pdf`);
}

function ArchiveDetailContent({ content, type }: { content: any; type: string }) {
  const { toast } = useToast();
  const copy = (text: string) => { navigator.clipboard.writeText(text); toast({ title: "Copié !" }); };

  if (!content) return <p className="text-muted-foreground text-sm">Aucun contenu disponible.</p>;

  const CopyBtn = ({ text }: { text: string }) => (
    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => copy(text)}>
      <Copy className="h-3 w-3" />
    </Button>
  );

  const ContentBlock = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`relative p-4 rounded-xl border border-border/15 hover:border-border/30 transition-colors ${className}`}>{children}</div>
  );

  if (content.phases && Array.isArray(content.phases)) {
    return (
      <div className="space-y-3">
        {content.phases.map((phase: any, i: number) => (
          <ContentBlock key={i}>
            <h3 className="text-sm font-medium text-foreground mb-2">{phase.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{phase.description}</p>
            {phase.post && (
              <div className="relative mt-3 p-3 rounded-lg bg-muted/20 border border-border/10">
                <CopyBtn text={phase.post} />
                <p className="text-sm text-foreground/70 pr-8 leading-relaxed">{phase.post}</p>
              </div>
            )}
          </ContentBlock>
        ))}
      </div>
    );
  }

  if (content.weeks && Array.isArray(content.weeks)) {
    return (
      <div className="space-y-3">
        {content.weeks.map((week: any, i: number) => (
          <ContentBlock key={i}>
            <h3 className="text-sm font-medium text-foreground mb-2">{week.week} — {week.theme}</h3>
            <div className="relative p-3 rounded-lg bg-muted/20 border border-border/10">
              <CopyBtn text={week.post} />
              <p className="text-sm text-foreground/70 pr-8 leading-relaxed">{week.post}</p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">{week.action}</p>
          </ContentBlock>
        ))}
      </div>
    );
  }

  if (content.responses && Array.isArray(content.responses)) {
    return (
      <div className="space-y-3">
        {content.responses.map((resp: any, i: number) => (
          <ContentBlock key={i}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-medium text-foreground">{resp.title}</h3>
              <Badge variant="outline" className="text-[10px] font-normal border-border/30 text-muted-foreground">{resp.tone}</Badge>
            </div>
            <div className="relative p-3 rounded-lg bg-muted/20 border border-border/10">
              <CopyBtn text={resp.text} />
              <p className="text-sm text-foreground/70 pr-8 leading-relaxed">{resp.text}</p>
            </div>
          </ContentBlock>
        ))}
      </div>
    );
  }

  if (content.posts && Array.isArray(content.posts)) {
    return (
      <div className="space-y-3">
        {content.posts.map((post: any, i: number) => (
          <ContentBlock key={i}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-primary/70 font-mono">Score: {post.score}/100</span>
              <Badge variant="outline" className="text-[10px] font-normal border-border/30 text-muted-foreground">{post.emotion}</Badge>
            </div>
            <div className="relative p-3 rounded-lg bg-muted/20 border border-border/10">
              <CopyBtn text={post.text} />
              <p className="text-sm text-foreground/70 pr-8 leading-relaxed">{post.text}</p>
            </div>
          </ContentBlock>
        ))}
      </div>
    );
  }

  if (content.forces || content.faiblesses || content.reponses) {
    return (
      <div className="space-y-5">
        {content.intention && (
          <ContentBlock>
            <p className="system-text tracking-widest mb-2">Intention détectée</p>
            <p className="text-sm text-foreground/80 leading-relaxed">{content.intention}</p>
          </ContentBlock>
        )}
        {content.forces?.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground/70 uppercase tracking-wider">Forces</p>
            <ul className="space-y-1.5">
              {content.forces.map((f: string, i: number) => (
                <li key={i} className="text-sm text-muted-foreground pl-3 border-l border-emerald-500/30 leading-relaxed">{f}</li>
              ))}
            </ul>
          </div>
        )}
        {content.faiblesses?.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground/70 uppercase tracking-wider">Faiblesses</p>
            <ul className="space-y-1.5">
              {content.faiblesses.map((f: string, i: number) => (
                <li key={i} className="text-sm text-muted-foreground pl-3 border-l border-red-500/30 leading-relaxed">{f}</li>
              ))}
            </ul>
          </div>
        )}
        {content.reponses?.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-foreground/70 uppercase tracking-wider">Réponses suggérées</p>
            {content.reponses.map((r: any, i: number) => (
              <div key={i} className="relative p-4 rounded-xl border border-border/15">
                <CopyBtn text={r.text} />
                <p className="text-[10px] text-muted-foreground mb-1.5">{r.title} — {r.tone}</p>
                <p className="text-sm text-foreground/70 pr-8 leading-relaxed">{r.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (content.question && content.response) {
    return (
      <div className="space-y-3">
        <ContentBlock className="border-primary/10">
          <p className="system-text tracking-widest mb-2">Question</p>
          <p className="text-sm text-foreground/80 leading-relaxed">{content.question}</p>
        </ContentBlock>
        <ContentBlock>
          <CopyBtn text={content.response} />
          <p className="system-text tracking-widest mb-2">Réponse</p>
          <p className="text-sm text-foreground/70 whitespace-pre-wrap pr-8 leading-relaxed">{content.response}</p>
        </ContentBlock>
      </div>
    );
  }

  return <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-auto font-mono">{JSON.stringify(content, null, 2)}</pre>;
}

export default function Archives() {
  const [archives, setArchives] = useState<ArchiveEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ArchiveEntry | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await fetchArchives(search || undefined);
    setArchives(data);
    setLoading(false);
  }, [user, search]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const ok = await deleteArchive(id);
    if (ok) {
      setArchives((prev) => prev.filter((a) => a.id !== id));
      if (selected?.id === id) setSelected(null);
      toast({ title: "Archive supprimée" });
    } else {
      toast({ title: "Erreur", description: "Impossible de supprimer.", variant: "destructive" });
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10 md:space-y-14 py-4 md:py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">Archives</h1>
        <p className="text-muted-foreground text-sm mt-2 max-w-lg leading-relaxed">
          Retrouvez toutes vos analyses et contenus générés.
        </p>
        <div className="system-line mt-6" />
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.5 }} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
        <Input
          placeholder="Rechercher…"
          className="pl-11 bg-muted/30 border-border/20 h-11 rounded-xl focus:border-border/50 focus:ring-0 placeholder:text-muted-foreground/40 text-sm transition-colors"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </motion.div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : archives.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <FolderArchive className="h-8 w-8 text-muted-foreground/20 mx-auto" />
          <p className="text-sm text-muted-foreground">
            {search ? "Aucun résultat trouvé." : "Aucune archive pour le moment."}
          </p>
          <p className="text-xs text-muted-foreground/60 max-w-sm mx-auto leading-relaxed">
            Vos analyses, contenus générés et conversations seront automatiquement sauvegardés ici.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {archives.map((item, i) => {
            const config = typeConfig[item.type] || { label: item.type, icon: FileText };
            const Icon = config.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.4 }}
                className="border border-border/15 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-border/30 transition-colors group"
                onClick={() => setSelected(item)}
              >
                <div className="w-9 h-9 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground/80 truncate group-hover:text-foreground transition-colors">{item.title}</p>
                  {item.summary && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{item.summary}</p>}
                  <p className="text-[10px] text-muted-foreground/50 font-mono mt-1">{formatDate(item.created_at)}</p>
                </div>
                <Badge variant="outline" className="text-[10px] font-normal border-border/20 text-muted-foreground shrink-0">{config.label}</Badge>
                <Button
                  variant="ghost" size="icon"
                  className="shrink-0 h-8 w-8 text-muted-foreground/30 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleDelete(item.id, e)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col border-border/20 bg-background">
          {selected && (() => {
            const config = typeConfig[selected.type] || { label: selected.type, icon: FileText };
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-normal border-border/20 text-muted-foreground">{config.label}</Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">{formatDate(selected.created_at)}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8 px-3 border border-border/20 rounded-lg" onClick={() => exportArchivePdf(selected)}>
                      <Download className="h-3 w-3" /> PDF
                    </Button>
                  </div>
                  <DialogTitle className="text-base font-medium mt-2">{selected.title}</DialogTitle>
                  {selected.summary && <p className="text-xs text-muted-foreground leading-relaxed">{selected.summary}</p>}
                </DialogHeader>
                <div className="system-line my-1" />
                <ScrollArea className="flex-1 -mx-6 px-6">
                  <ArchiveDetailContent content={selected.content} type={selected.type} />
                </ScrollArea>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
