/** Spoofs a real Chrome desktop request so scraping/verification fetches
 * aren't rejected outright by sites that block bare server-side User-Agents. */
export function browserHeaders(referer?: string): HeadersInit {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    ...(referer ? { Referer: referer } : {}),
  };
}
