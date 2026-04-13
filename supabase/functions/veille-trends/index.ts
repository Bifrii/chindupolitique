import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Media sources: RSS first, HTML fallback pages second
interface MediaSource {
  name: string;
  homepage: string;
  section_url: string;
  region_url?: string;
  rss_preferred: boolean;
  parser_type: "rss_or_html" | "html" | "rss";
}

const MEDIA_SOURCES: MediaSource[] = [
  {
    name: "Radio Okapi",
    homepage: "https://www.radiookapi.net/",
    section_url: "https://www.radiookapi.net/actualite",
    region_url: "https://www.radiookapi.net/region/rdc",
    rss_preferred: true,
    parser_type: "rss_or_html",
  },
  {
    name: "Actualite.cd",
    homepage: "https://actualite.cd/",
    section_url: "https://actualite.cd/category/actualite/politique",
    rss_preferred: false,
    parser_type: "html",
  },
  {
    name: "7sur7.cd",
    homepage: "https://7sur7.cd/",
    section_url: "https://7sur7.cd/category/politique",
    rss_preferred: false,
    parser_type: "html",
  },
];

// Derive RSS feed URL from homepage
function getRssUrl(src: MediaSource): string {
  return src.homepage.replace(/\/$/, "") + "/feed";
}

interface RawHeadline {
  title: string;
  summary: string;
  link: string;
  source: string;
  publishedAt: string;
}

const FETCH_OPTS = {
  headers: { "User-Agent": "Mozilla/5.0 (compatible; VeilleBot/1.0)" },
  signal: undefined as AbortSignal | undefined,
};

function makeSignal() {
  return AbortSignal.timeout(12000);
}

// ── RSS fetcher ──────────────────────────────────────────────
async function fetchRSS(name: string, url: string): Promise<RawHeadline[]> {
  const headlines: RawHeadline[] = [];
  console.log(`[RSS] ${name}: fetching ${url}`);
  const resp = await fetch(url, { ...FETCH_OPTS, signal: makeSignal() });
  if (!resp.ok) { console.warn(`[RSS] ${name}: HTTP ${resp.status}`); return []; }
  const xml = await resp.text();
  console.log(`[RSS] ${name}: ${xml.length} chars`);

  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (!doc) { console.warn(`[RSS] ${name}: parse failed`); return []; }

  let items = doc.querySelectorAll("item");
  if (items.length === 0) items = doc.querySelectorAll("entry");

  const count = Math.min(items.length, 10);
  for (let i = 0; i < count; i++) {
    const item = items[i];
    const title = item.querySelector("title")?.textContent?.trim() || "";
    if (!title) continue;

    let summary = item.querySelector("description")?.textContent?.trim() ||
      item.querySelector("summary")?.textContent?.trim() || "";
    summary = summary.replace(/<[^>]*>/g, "").trim();
    if (summary.length > 300) summary = summary.substring(0, 300) + "…";

    const link = item.querySelector("link")?.textContent?.trim() ||
      item.querySelector("link")?.getAttribute("href") || "";

    const pubDate = item.querySelector("pubDate")?.textContent?.trim() ||
      item.querySelector("published")?.textContent?.trim() ||
      item.querySelector("updated")?.textContent?.trim() || "";

    headlines.push({ title, summary, link, source: name, publishedAt: pubDate || new Date().toISOString() });
  }
  console.log(`[RSS] ${name}: ${headlines.length} headlines`);
  return headlines;
}

// ── HTML fallback fetcher ────────────────────────────────────
async function fetchHTML(name: string, url: string): Promise<RawHeadline[]> {
  const headlines: RawHeadline[] = [];
  console.log(`[HTML] ${name}: fetching ${url}`);
  const resp = await fetch(url, { ...FETCH_OPTS, signal: makeSignal() });
  if (!resp.ok) { console.warn(`[HTML] ${name}: HTTP ${resp.status}`); return []; }
  const html = await resp.text();
  console.log(`[HTML] ${name}: ${html.length} chars`);

  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) { console.warn(`[HTML] ${name}: parse failed`); return []; }

  // Strategy: look for article / h2>a / h3>a / .node-title a patterns
  const selectors = [
    "article h2 a", "article h3 a",
    ".view-content h2 a", ".view-content h3 a",
    ".node-title a", ".views-row h2 a",
    "h2.entry-title a", "h3.entry-title a",
    ".post-title a", ".article-title a",
    "h2 a", "h3 a",
  ];

  const seen = new Set<string>();
  for (const sel of selectors) {
    const links = doc.querySelectorAll(sel);
    for (let i = 0; i < links.length && headlines.length < 10; i++) {
      const el = links[i] as unknown as { textContent: string; getAttribute: (a: string) => string | null };
      const title = el.textContent?.trim();
      if (!title || title.length < 10) continue;
      if (seen.has(title)) continue;
      seen.add(title);

      let href = el.getAttribute("href") || "";
      if (href && !href.startsWith("http")) {
        const base = new URL(url);
        href = `${base.origin}${href.startsWith("/") ? "" : "/"}${href}`;
      }

      headlines.push({ title, summary: "", link: href, source: name, publishedAt: new Date().toISOString() });
    }
    if (headlines.length >= 5) break;
  }
  console.log(`[HTML] ${name}: ${headlines.length} headlines`);
  return headlines;
}

// ── Per-source orchestrator based on config ─────────────────
async function fetchSource(src: MediaSource): Promise<RawHeadline[]> {
  // Try RSS first if preferred or parser_type includes rss
  if (src.rss_preferred || src.parser_type === "rss" || src.parser_type === "rss_or_html") {
    try {
      const results = await fetchRSS(src.name, getRssUrl(src));
      if (results.length > 0) return results;
    } catch (err) {
      console.warn(`[SOURCE] ${src.name} RSS failed:`, err);
    }
  }

  // HTML fallback (if parser_type allows)
  if (src.parser_type === "html" || src.parser_type === "rss_or_html") {
    const combined: RawHeadline[] = [];
    const htmlUrls = [src.section_url, src.region_url].filter(Boolean) as string[];
    for (const url of htmlUrls) {
      try {
        const results = await fetchHTML(src.name, url);
        combined.push(...results);
      } catch (err) {
        console.warn(`[SOURCE] ${src.name} HTML failed (${url}):`, err);
      }
    }
    return combined;
  }

  return [];
}

// ── Deduplication ────────────────────────────────────────────
function dedup(headlines: RawHeadline[]): RawHeadline[] {
  const seen = new Set<string>();
  return headlines.filter(h => {
    const key = h.title.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Main handler ─────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const _supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await _supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Step 1: Fetch headlines from all sources in parallel
    console.log("[STEP 1] Fetching from", MEDIA_SOURCES.length, "sources…");
    const results = await Promise.allSettled(MEDIA_SOURCES.map(s => fetchSource(s)));

    const allHeadlines: RawHeadline[] = [];
    const failedSources: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value.length > 0) {
        allHeadlines.push(...r.value);
      } else {
        failedSources.push(MEDIA_SOURCES[i].name);
      }
    });

    const unique = dedup(allHeadlines);
    console.log(`[STEP 1] ${unique.length} unique headlines (${failedSources.length} sources failed: ${failedSources.join(", ") || "none"})`);

    if (unique.length === 0) {
      return new Response(JSON.stringify({
        trends: [],
        analyse_globale: "Aucune donnée disponible — impossible de se connecter aux sources d'actualité.",
        niveau_tension_national: 0,
        timestamp: new Date().toISOString(),
        sources_count: 0,
        sources_names: [],
        failed_sources: failedSources,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 2: AI analysis
    console.log("[STEP 2] Sending", unique.length, "headlines to AI…");
    const headlinesText = unique.map((h, i) =>
      `[${i + 1}] "${h.title}" — ${h.source} (${h.publishedAt})${h.summary ? `\n    ${h.summary}` : ""}`
    ).join("\n");

    const systemPrompt = `Tu es un analyste politique expert spécialisé sur la RDC (République Démocratique du Congo).

Tu reçois une liste de titres d'actualité réels provenant de médias congolais. Ta mission:
1. Identifier les 5 sujets politiques principaux en regroupant les articles similaires
2. Pour chaque sujet, synthétiser les informations disponibles
3. Évaluer l'intensité, le sentiment et la région concernée
4. Fournir une analyse globale de la situation politique du jour
5. Évaluer le niveau de tension national (0-100)

IMPORTANT: Base-toi UNIQUEMENT sur les articles fournis. Ne fabrique pas d'informations.
Si un sujet n'a qu'un seul article, c'est acceptable — mentionne-le.
Cite les sources réelles des articles.`;

    const userPrompt = `Voici les ${unique.length} titres d'actualité collectés aujourd'hui (${new Date().toISOString().split('T')[0]}) depuis les médias congolais:

${headlinesText}

Analyse ces titres et identifie les 5 sujets politiques les plus importants.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_veille_data",
            description: "Return the top 5 political trends in DRC with analysis",
            parameters: {
              type: "object",
              properties: {
                trends: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      rank: { type: "number" },
                      titre: { type: "string" },
                      resume: { type: "string" },
                      categorie: { type: "string", enum: ["Politique", "Sécurité", "Économie", "Social", "International"] },
                      intensite: { type: "string", enum: ["Faible", "Moyenne", "Élevée", "Critique"] },
                      sources: { type: "array", items: { type: "string" } },
                      hashtags_associes: { type: "array", items: { type: "string" } },
                      sentiment_dominant: { type: "string", enum: ["Positif", "Négatif", "Mitigé"] },
                      region_concernee: { type: "string" },
                    },
                    required: ["rank", "titre", "resume", "categorie", "intensite", "sources", "hashtags_associes", "sentiment_dominant", "region_concernee"],
                    additionalProperties: false,
                  },
                },
                analyse_globale: { type: "string" },
                niveau_tension_national: { type: "number" },
                timestamp: { type: "string" },
              },
              required: ["trends", "analyse_globale", "niveau_tension_national", "timestamp"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_veille_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, veuillez réessayer plus tard." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits insuffisants. Ajoutez des crédits à votre espace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("[AI ERROR]", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    console.log("[STEP 2] AI response received");

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let result: Record<string, unknown>;

    if (toolCall) {
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("[PARSE] Failed to parse tool call arguments");
        result = { trends: [], analyse_globale: "", niveau_tension_national: 0, timestamp: new Date().toISOString() };
      }
    } else {
      const content = data.choices?.[0]?.message?.content || "";
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { result = JSON.parse(jsonMatch[0]); } catch { result = { trends: [], analyse_globale: "", niveau_tension_national: 0, timestamp: new Date().toISOString() }; }
      } else {
        result = { trends: [], analyse_globale: "", niveau_tension_national: 0, timestamp: new Date().toISOString() };
      }
    }

    if (!result.trends || !Array.isArray(result.trends)) result.trends = [];
    if (!result.timestamp) result.timestamp = new Date().toISOString();
    result.sources_count = unique.length;
    result.sources_names = [...new Set(unique.map(h => h.source))];
    result.failed_sources = failedSources;

    console.log(`[DONE] ${(result.trends as unknown[]).length} trends from ${unique.length} articles`);

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[FATAL] veille-trends error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
