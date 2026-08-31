type BotSignature = { name: string; pattern: RegExp };

// Ordered roughly by how likely each is to actually show up: search engine
// crawlers first, then social-link-preview bots, then AI/LLM crawlers, then
// SEO tools and generic scripts. Matched against the raw User-Agent string.
const KNOWN_BOTS: BotSignature[] = [
  { name: "Googlebot", pattern: /googlebot|google-inspectiontool|googleother/i },
  { name: "Bingbot", pattern: /bingbot|adidxbot|bingpreview/i },
  { name: "Yandex", pattern: /yandexbot/i },
  { name: "Baidu", pattern: /baiduspider/i },
  { name: "DuckDuckGo", pattern: /duckduckbot/i },
  { name: "Applebot", pattern: /applebot/i },
  { name: "Facebook", pattern: /facebookexternalhit|facebot/i },
  { name: "Twitter/X", pattern: /twitterbot/i },
  { name: "Discord", pattern: /discordbot/i },
  { name: "Telegram", pattern: /telegrambot/i },
  { name: "WhatsApp", pattern: /whatsapp/i },
  { name: "Slack", pattern: /slackbot/i },
  { name: "LinkedIn", pattern: /linkedinbot/i },
  { name: "Pinterest", pattern: /pinterest/i },
  { name: "GPTBot (OpenAI)", pattern: /gptbot|oai-searchbot|chatgpt-user/i },
  { name: "ClaudeBot", pattern: /claudebot|claude-web|anthropic-ai/i },
  { name: "PerplexityBot", pattern: /perplexitybot/i },
  { name: "CCBot (Common Crawl)", pattern: /ccbot/i },
  { name: "Bytespider", pattern: /bytespider/i },
  { name: "PetalBot", pattern: /petalbot/i },
  { name: "AhrefsBot", pattern: /ahrefsbot/i },
  { name: "SemrushBot", pattern: /semrushbot/i },
  { name: "MJ12bot", pattern: /mj12bot/i },
  { name: "DotBot", pattern: /dotbot/i },
  { name: "UptimeRobot", pattern: /uptimerobot/i },
  { name: "Pingdom", pattern: /pingdom/i },
  { name: "Headless Chrome", pattern: /headlesschrome/i },
  { name: "PhantomJS", pattern: /phantomjs/i },
  { name: "curl", pattern: /^curl\// },
  { name: "wget", pattern: /^wget\// },
  { name: "Python script", pattern: /python-requests|python-urllib|scrapy/i },
  { name: "Java/Go/Node script", pattern: /^(java|go-http-client|node-fetch|axios|okhttp)\b/i },
  // Catch-all: anything that self-identifies with "bot", "crawler", or
  // "spider" but wasn't recognized above.
  { name: "Bot (otro)", pattern: /\bbot\b|crawler|spider|scraper/i },
];

export type VisitorType = { isBot: boolean; label: string };

/** Best-effort User-Agent classification for the visits table -- a simple
 * signature match, not a security control (a motivated bot can always
 * spoof a browser UA). Good enough to eyeball where traffic comes from. */
export function classifyUserAgent(userAgent: string | null): VisitorType {
  if (!userAgent || !userAgent.trim()) {
    return { isBot: true, label: "Bot (sin user-agent)" };
  }
  for (const bot of KNOWN_BOTS) {
    if (bot.pattern.test(userAgent)) return { isBot: true, label: bot.name };
  }
  return { isBot: false, label: "Usuario real" };
}
