import type { NextRequest } from "next/server";
import { after } from "next/server";
import { computeFingerprint } from "@/lib/scoring/fingerprint";
import { classifyUa } from "@/lib/scoring/ua-classify";
import { evaluateRequestSignals } from "@/lib/scoring/request-signals";
import { recordHit } from "@/lib/scoring/request-log";
import {
  recordSignals,
  verifyAndScoreCrawler,
  recordHoneypotHit,
  runAggregateSignals,
} from "@/lib/scoring/engine";

// Ruta trampa: un link invisible (ver HoneypotLink.tsx) apunta acá y
// robots.txt la bloquea explícitamente. Nadie con un navegador normal ni
// un crawler que respete robots.txt debería llegar nunca a esta URL.
export const HONEYPOT_PATH_PREFIX = "/preview-full";

/**
 * Se llama desde proxy.ts para cada request de página HTML real (ya
 * filtrado: sin assets, sin sesión de admin autenticada). Todo el
 * trabajo de puntaje (DNS, lecturas/escrituras de IpScore) se agenda con
 * after() para no sumarle latencia al response -- ver restricción de "no
 * debe añadir carga perceptible por request" en el pedido original.
 */
export function scheduleScoring(req: NextRequest, ip: string | null, pathname: string): void {
  scheduleScoringInternal(req, ip, pathname, /* isHtmlHit */ true);
}

/**
 * Variante para /api/* (spec: "acceso directo a endpoints de datos").
 * No pasa por ensureVisit ni por la cookie de visita -- las rutas de API
 * manejan su propia lógica sin tocarla, esto solo agrega visibilidad de
 * puntaje. No cuenta como "htmlHits" (el ratio de assets es sobre
 * navegaciones de página real, no sobre cada fetch() a la API).
 */
export function scheduleApiScoring(req: NextRequest, ip: string | null, pathname: string): void {
  scheduleScoringInternal(req, ip, pathname, /* isHtmlHit */ false);
}

function scheduleScoringInternal(
  req: NextRequest,
  ip: string | null,
  pathname: string,
  isHtmlHit: boolean
): void {
  if (!ip) return;

  // Guarda la URL completa (con query string), no solo el path -- la
  // detección de IDs/paginación secuencial en engine.ts necesita ver
  // también `?page=2`, `?page=3`... no solo `/video/2`, `/video/3`.
  recordHit(ip, pathname + req.nextUrl.search);

  if (pathname.startsWith(HONEYPOT_PATH_PREFIX)) {
    after(() => recordHoneypotHit(ip).catch(() => {}));
    return;
  }

  const fingerprint = computeFingerprint(req);
  const ua = classifyUa(req.headers.get("user-agent"));
  const signals = evaluateRequestSignals(req, ua);

  after(async () => {
    await recordSignals(ip, signals, { fingerprint, isHtmlHit }).catch(() => {});
    if (ua.category === "claimed_crawler" && ua.claimedCrawler) {
      await verifyAndScoreCrawler(ip, ua.claimedCrawler).catch(() => {});
    }
    await runAggregateSignals(ip).catch(() => {});
  });
}
