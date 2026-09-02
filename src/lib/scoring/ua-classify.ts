// Clasificación de User-Agent para el motor de puntaje. Independiente de
// src/lib/visitor-type.ts (que solo alimenta la tabla de visitas actual):
// acá necesitamos distinguir "hay que verificar por DNS antes de puntuar"
// de "biblioteca/script, siempre sospechoso" en vez de una sola etiqueta.

export type UaCategory =
  | "empty"
  | "claimed_crawler" // Googlebot, Bingbot, facebookexternalhit... requiere verificación DNS
  | "other_named_bot" // SEO tools, monitores: se excluye del puntaje, no se verifica
  | "library"
  | "headless"
  | "browser";

export type ClaimedCrawler = { name: string; pattern: RegExp; verifyDomains: string[] };

// Solo los que vale la pena verificar por DNS antes de confiar: motores de
// búsqueda y bots de preview social (spec 5: "nunca bloquear crawlers de
// buscadores ni tráfico de redes sociales"). verifyDomains son los sufijos
// de hostname que el reverse-DNS del operador oficial debe terminar en.
export const CLAIMED_CRAWLERS: ClaimedCrawler[] = [
  { name: "Googlebot", pattern: /googlebot|google-inspectiontool|googleother/i, verifyDomains: ["googlebot.com", "google.com"] },
  { name: "Bingbot", pattern: /bingbot|adidxbot|bingpreview/i, verifyDomains: ["search.msn.com"] },
  { name: "Yandex", pattern: /yandexbot/i, verifyDomains: ["yandex.ru", "yandex.net", "yandex.com"] },
  { name: "Baidu", pattern: /baiduspider/i, verifyDomains: ["baidu.com", "baidu.jp"] },
  { name: "DuckDuckGo", pattern: /duckduckbot/i, verifyDomains: ["duckduckgo.com"] },
  { name: "Applebot", pattern: /applebot/i, verifyDomains: ["applebot.apple.com"] },
  { name: "Facebook", pattern: /facebookexternalhit|facebot/i, verifyDomains: ["fbsv.net", "facebook.com"] },
  { name: "Twitter/X", pattern: /twitterbot/i, verifyDomains: ["twttr.com", "twitter.com", "x.com"] },
  { name: "LinkedIn", pattern: /linkedinbot/i, verifyDomains: ["linkedin.com"] },
];

// Se ven a veces, se identifican solos, no son el objetivo de este sistema
// (no son buscadores ni redes sociales) -- se dejan fuera del puntaje en
// vez de arriesgar falsos positivos intentando verificarlos.
const OTHER_NAMED_BOT_RE =
  /discordbot|telegrambot|whatsapp|slackbot|pinterest|gptbot|oai-searchbot|chatgpt-user|claudebot|claude-web|anthropic-ai|perplexitybot|ccbot|bytespider|petalbot|ahrefsbot|semrushbot|mj12bot|dotbot|uptimerobot|pingdom/i;

const LIBRARY_RE =
  /^curl\/|^wget\/|python-requests|python-urllib|scrapy|^(java|go-http-client|node-fetch|axios|okhttp)\b/i;

const HEADLESS_RE = /headlesschrome|phantomjs/i;

const BROWSER_HINT_RE = /chrome|firefox|safari|edg\/|edge\/|opr\/|opera/i;

export type UaClassification = {
  category: UaCategory;
  claimedCrawler?: ClaimedCrawler;
  looksLikeBrowser: boolean;
};

export function classifyUa(userAgent: string | null): UaClassification {
  if (!userAgent || !userAgent.trim()) {
    return { category: "empty", looksLikeBrowser: false };
  }

  const claimed = CLAIMED_CRAWLERS.find((c) => c.pattern.test(userAgent));
  if (claimed) return { category: "claimed_crawler", claimedCrawler: claimed, looksLikeBrowser: false };

  if (OTHER_NAMED_BOT_RE.test(userAgent)) {
    return { category: "other_named_bot", looksLikeBrowser: false };
  }
  if (LIBRARY_RE.test(userAgent)) {
    return { category: "library", looksLikeBrowser: false };
  }
  if (HEADLESS_RE.test(userAgent)) {
    return { category: "headless", looksLikeBrowser: BROWSER_HINT_RE.test(userAgent) };
  }
  // Catch-all genérico ("bot", "crawler", "spider", "scraper" sin nombre
  // reconocido): no se puntúa por UA sola -- las señales de comportamiento
  // (asset ratio, JS, velocidad) son las que lo van a atrapar si en
  // realidad está scrapeando. Evita falsos positivos por auto-declararse.
  return {
    category: "browser",
    looksLikeBrowser: BROWSER_HINT_RE.test(userAgent),
  };
}
