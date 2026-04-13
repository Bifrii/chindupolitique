import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Bot, Send, User } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";
import { saveArchive } from "@/lib/archiveService";
import { useGuestUsage } from "@/hooks/useGuestUsage";
import { PremiumLoginModal } from "@/components/PremiumLoginModal";

type Message = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const suggestedPrompts = [
  "Comment répondre aux accusations de corruption ?",
  "Prépare-moi un discours pour la jeunesse de Kinshasa",
  "Analyse la stratégie de communication de mon rival",
  "Quelle position adopter sur la question du Kivu ?",
];

async function streamChat({
  messages, userProfile, onDelta, onDone,
}: {
  messages: Message[]; userProfile?: any;
  onDelta: (text: string) => void; onDone: () => void;
}) {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const resp = await fetch(CHAT_URL, {
    method: "POST", headers,
    body: JSON.stringify({ messages, userProfile }),
  });
  if (!resp.ok || !resp.body) {
    const errorData = await resp.json().catch(() => ({}));
    throw new Error(errorData.error || "Erreur de connexion au serveur");
  }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;
  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });
    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") { streamDone = true; break; }
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }
  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }
  onDone();
}

export default function AIStrategist() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { profile } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const hasAutoSent = useRef(false);
  const { checkAndIncrement, showLoginModal, setShowLoginModal } = useGuestUsage();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (hasAutoSent.current) return;
    const q = searchParams.get("q");
    const action = searchParams.get("action");
    if (q || action) {
      hasAutoSent.current = true;
      const actionLabels: Record<string, string> = {
        crise: "gestion de crise", image: "amélioration d'image",
        attaque: "réponse à une attaque", viral: "création de message viral",
      };
      const prompt = action && actionLabels[action]
        ? `${q ? q + " — " : ""}Aide-moi avec une stratégie de ${actionLabels[action]}.`
        : q || "";
      if (prompt) {
        setSearchParams({}, { replace: true });
        setTimeout(() => handleSend(prompt), 100);
      }
    }
  }, []);

  const handleSend = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim() || isLoading) return;
    if (!checkAndIncrement()) return;
    const userMsg: Message = { role: "user", content: msg };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);
    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };
    try {
      await streamChat({
        messages: allMessages, userProfile: profile,
        onDelta: (chunk) => upsertAssistant(chunk),
        onDone: () => {
          setIsLoading(false);
          if (assistantSoFar.length > 50) {
            saveArchive({
              type: "strategie", title: `Stratégie : ${msg.slice(0, 60)}`,
              summary: assistantSoFar.slice(0, 150),
              content: { question: msg, response: assistantSoFar },
              source_module: "stratege",
            });
          }
        },
      });
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Erreur : ${e.message || "Impossible de contacter le serveur."}` },
      ]);
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col" style={{ height: 'calc(100dvh - 8rem)' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-4 shrink-0">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Stratège IA</h1>
        <p className="text-muted-foreground text-xs mt-1">
          Votre conseiller politique stratégique spécialisé en communication politique en RDC.
        </p>
        <div className="system-line mt-4" />
      </motion.div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1 md:pr-2">
        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full text-center px-2">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
              <Bot className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold tracking-tight mb-2">Bienvenue dans le Stratège IA</h2>
            <p className="text-xs text-muted-foreground max-w-md mb-6">
              Je suis votre conseiller politique stratégique. Je connais les dynamiques politiques locales, les figures influentes, les enjeux ethniques, régionaux et institutionnels de la RDC.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="text-left p-3 rounded-lg bg-muted/40 border border-border/30 text-xs hover:bg-muted/70 transition-colors text-foreground/70"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-2 md:gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-1">
                <Bot className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            )}
            <div
              className={`max-w-[88%] sm:max-w-[85%] md:max-w-[80%] p-3 md:p-4 rounded-xl text-sm leading-relaxed break-words overflow-hidden ${
                msg.role === "user"
                  ? "bg-accent text-foreground rounded-br-sm"
                  : "glass-card rounded-bl-sm"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_strong]:text-foreground">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : msg.content}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-1">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            )}
          </motion.div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Bot className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="glass-card rounded-xl rounded-bl-sm p-4">
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pt-3 md:pt-4 shrink-0 sticky bottom-0 bg-background/80 backdrop-blur-sm pb-1">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez votre question stratégique…"
            className="flex-1 bg-muted/50 border-border/40 h-12"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()} className="h-12 px-4 md:px-5">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
      <PremiumLoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
    </div>
  );
}
