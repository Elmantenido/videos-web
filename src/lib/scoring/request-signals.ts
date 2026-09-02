import type { NextRequest } from "next/server";
import type { UaClassification } from "@/lib/scoring/ua-classify";
import type { SignalKey } from "@/lib/scoring/config";

export type RawSignal = { key: SignalKey; detail?: string };

// "json", "feed", "format=json", "export", "dump"... no hay ningún uso
// legítimo de estos en el sitio (no es WordPress, no tiene esa
// convención) -- si aparecen, alguien está probando a mano un patrón
// típico de scraping de otros sitios.
const SUSPICIOUS_QUERY_RE = /[?&](?:json|feed|export|dump)\b|format=json/i;

/**
 * Acceso directo a un endpoint de datos (spec: "acceso directo a
 * endpoints de datos"). GET a /api/* sin Referer -- en este sitio TODOS
 * los fetch() legítimos a /api (buscador en vivo, carrusel de random,
 * trending, reportar problema, tracking de reproducción) salen desde una
 * página ya cargada, y con Referrer-Policy: strict-origin-when-cross-origin
 * (next.config.ts) el navegador manda el Referer completo en same-origin.
 * Sin Referer en un GET a /api es casi siempre un cliente HTTP crudo
 * pegándole al endpoint directo, no un fetch() disparado desde el sitio.
 * Los beacons propios (/api/visit/*) quedan afuera: no son "datos".
 */
function evaluateApiSignal(req: NextRequest, pathname: string): RawSignal[] {
  if (!pathname.startsWith("/api/") || pathname.startsWith("/api/visit/")) return [];
  if (req.method !== "GET") return [];
  if (req.headers.get("referer")) return [];
  return [{ key: "direct_api_access", detail: pathname + req.nextUrl.search }];
}

/**
 * Señales que se pueden evaluar de forma síncrona con lo que ya viene en
 * el request (sin I/O, sin await) -- se llaman en proxy.ts en el camino
 * caliente, así que tienen que ser baratas. Todo lo que necesita mirar
 * historial (velocidad, ratio de assets, IDs secuenciales...) vive en
 * engine.ts/aggregate, corrido en segundo plano vía after().
 */
export function evaluateRequestSignals(req: NextRequest, ua: UaClassification): RawSignal[] {
  const signals: RawSignal[] = [];
  const headers = req.headers;
  const userAgent = headers.get("user-agent") ?? undefined;
  const pathname = req.nextUrl.pathname;

  signals.push(...evaluateApiSignal(req, pathname));
  if (SUSPICIOUS_QUERY_RE.test(req.nextUrl.search)) {
    signals.push({ key: "suspicious_query_param", detail: req.nextUrl.search });
  }

  if (ua.category === "empty") {
    signals.push({ key: "empty_ua" });
    return signals;
  }
  if (ua.category === "library") {
    signals.push({ key: "library_ua", detail: userAgent });
    return signals;
  }
  if (ua.category === "headless") {
    signals.push({ key: "headless_browser_ua", detail: userAgent });
    return signals;
  }

  // "claimed_crawler" y "other_named_bot" no se puntúan por header
  // coherence -- el primero se resuelve por DNS (bot-verify.ts), el
  // segundo se deja fuera del puntaje a propósito (ver ua-classify.ts).
  if (ua.category !== "browser") return signals;

  // Coherencia navegador-vs-headers: solo tiene sentido exigirla cuando el
  // UA se hace pasar por un navegador real.
  if (ua.looksLikeBrowser) {
    const acceptLanguage = headers.get("accept-language");
    const acceptEncoding = headers.get("accept-encoding");
    const hasSecFetch =
      headers.has("sec-fetch-site") || headers.has("sec-fetch-mode") || headers.has("sec-fetch-dest");

    if (!acceptLanguage) signals.push({ key: "missing_accept_language" });
    if (!acceptEncoding) signals.push({ key: "missing_accept_encoding" });
    // Safari (sobre todo versiones viejas) no siempre manda Sec-Fetch-*,
    // así que esta señal pesa poco a propósito -- ajustar en
    // scraping_detection_config si genera falsos positivos de Safari.
    if (!hasSecFetch) signals.push({ key: "missing_sec_fetch" });
  }

  return signals;
}
