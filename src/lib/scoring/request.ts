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
 * Se llama desde proxy.ts para cada request HTML real (ya filtrado: sin
 * assets, sin sesión de admin autenticada). Todo el trabajo de puntaje
 * (DNS, lecturas/escrituras de IpScore) se agenda con after() para no
 * sumarle latencia al response -- ver restricción de "no debe añadir
 * carga perceptible por request" en el pedido original.
 */
export function scheduleScoring(req: NextRequest, ip: string | null, pathname: string): void {
  if (!ip) return;

  recordHit(ip, pathname);

  if (pathname.startsWith(HONEYPOT_PATH_PREFIX)) {
    after(() => recordHoneypotHit(ip).catch(() => {}));
    return;
  }

  const fingerprint = computeFingerprint(req);
  const ua = classifyUa(req.headers.get("user-agent"));
  const signals = evaluateRequestSignals(req, ua);

  after(async () => {
    await recordSignals(ip, signals, { fingerprint, isHtmlHit: true }).catch(() => {});
    if (ua.category === "claimed_crawler" && ua.claimedCrawler) {
      await verifyAndScoreCrawler(ip, ua.claimedCrawler).catch(() => {});
    }
    await runAggregateSignals(ip).catch(() => {});
  });
}
