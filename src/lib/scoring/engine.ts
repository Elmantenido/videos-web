import { prisma } from "@/lib/prisma";
import { getScoringConfig, stateForScore, type ScoringConfig, type SignalKey } from "@/lib/scoring/config";
import type { RawSignal } from "@/lib/scoring/request-signals";
import { verifyClaimedCrawler } from "@/lib/scoring/bot-verify";
import type { ClaimedCrawler } from "@/lib/scoring/ua-classify";
import { getRecentHits } from "@/lib/scoring/request-log";
import { getPendingAssetHits } from "@/lib/scoring/asset-hits";

function decay(score: number, hoursElapsed: number, halfLifeHours: number): number {
  if (hoursElapsed <= 0 || score <= 0) return score;
  return score * Math.pow(0.5, hoursElapsed / halfLifeHours);
}

const PAGINATION_PARAM_RE = /[?&](?:page|p|offset|pagina)=(\d+)/i;
const TRAILING_NUMBER_RE = /(\d+)(?:[/?#].*)?$/;

/** Número de secuencia de una URL (path+query), para detectar recorridos
 * ordenados: primero intenta un parámetro de paginación explícito
 * (?page=3), y si no hay, el número al final del path (/video/3). */
function extractSequenceNumber(url: string): number | null {
  const paramMatch = url.match(PAGINATION_PARAM_RE);
  if (paramMatch) return Number(paramMatch[1]);
  const trailingMatch = url.match(TRAILING_NUMBER_RE);
  return trailingMatch ? Number(trailingMatch[1]) : null;
}

export type TouchInfo = {
  fingerprint?: string | null;
  country?: string | null;
  isHtmlHit?: boolean;
};

/**
 * Punto de entrada único para escribir puntaje: decae el score existente
 * una sola vez, aplica todas las señales de este request (respetando el
 * cooldown por señal para que una condición sostenida no infle el puntaje
 * request tras request) y deja el desglose auditable en ScoreSignal.
 * `signals` puede venir vacío -- igual se usa para refrescar contadores
 * (requestCount/htmlHits/lastSeenAt) de los que depende el paso agregado.
 */
export async function recordSignals(ip: string, signals: RawSignal[], touch: TouchInfo = {}): Promise<void> {
  const config = await getScoringConfig();
  const existing = await prisma.ipScore.findUnique({ where: { ip } });

  // verifiedBot también se corta acá, no solo en runAggregateSignals --
  // esta función también se llama directo desde request.ts por cada
  // request (por ejemplo si algún día una señal de request-level llega a
  // dispararle a un crawler verificado), y el criterio de aceptación es
  // que un Googlebot verificado nunca sume puntaje, no solo que las
  // señales agregadas lo ignoren.
  if (existing?.whitelisted || existing?.verifiedBot) return;

  const now = new Date();
  const hoursElapsed = existing ? (now.getTime() - existing.lastSeenAt.getTime()) / 3_600_000 : 0;
  let score = decay(existing?.score ?? 0, hoursElapsed, config.decayHalfLifeHours);

  const keysToCheck = [...new Set(signals.map((s) => s.key))];
  const recentByKey = keysToCheck.length
    ? await prisma.scoreSignal.findMany({
        where: {
          ip,
          key: { in: keysToCheck },
          createdAt: { gte: new Date(now.getTime() - config.signalCooldownMinutes * 60_000) },
        },
        select: { key: true },
        distinct: ["key"],
      })
    : [];
  const onCooldown = new Set(recentByKey.map((r) => r.key));

  const applied: { key: SignalKey; weight: number; detail: string | null }[] = [];
  for (const signal of signals) {
    if (onCooldown.has(signal.key)) continue;
    onCooldown.add(signal.key); // no aplicar dos veces la misma señal en el mismo batch
    const weight = config.weights[signal.key] ?? 0;
    if (weight === 0) continue;
    score += weight;
    applied.push({ key: signal.key, weight, detail: signal.detail ?? null });
  }

  const state = stateForScore(score, config.thresholds);

  await prisma.$transaction([
    prisma.ipScore.upsert({
      where: { ip },
      update: {
        score: Math.round(score),
        state,
        lastSeenAt: now,
        requestCount: { increment: 1 },
        htmlHits: touch.isHtmlHit ? { increment: 1 } : undefined,
        fingerprint: touch.fingerprint ?? undefined,
        country: touch.country ?? undefined,
      },
      create: {
        ip,
        score: Math.round(Math.max(score, 0)),
        state,
        requestCount: 1,
        htmlHits: touch.isHtmlHit ? 1 : 0,
        fingerprint: touch.fingerprint ?? null,
        country: touch.country ?? null,
      },
    }),
    ...(applied.length
      ? [
          prisma.scoreSignal.createMany({
            data: applied.map((a) => ({ ip, key: a.key, weight: a.weight, detail: a.detail })),
          }),
        ]
      : []),
  ]);
}

/** Impacta un link honeypot invisible bloqueado en robots.txt -- casi
 * imposible para un humano o un crawler que respete robots.txt. Fuerza
 * "confirmado" de inmediato en vez de esperar a que el puntaje acumule. */
export async function recordHoneypotHit(ip: string): Promise<void> {
  const config = await getScoringConfig();
  const existing = await prisma.ipScore.findUnique({ where: { ip } });
  if (existing?.whitelisted) return;

  const score = Math.max(existing?.score ?? 0, config.thresholds.confirmado) + 50;
  await prisma.$transaction([
    prisma.ipScore.upsert({
      where: { ip },
      update: { score, state: "confirmado", honeypotHit: true, lastSeenAt: new Date() },
      create: { ip, score, state: "confirmado", honeypotHit: true, requestCount: 1 },
    }),
    prisma.scoreSignal.create({
      data: {
        ip,
        key: "honeypot",
        weight: config.weights.honeypot,
        detail: "Visitó un enlace invisible bloqueado en robots.txt",
      },
    }),
  ]);
}

/** Suma hits de recursos estáticos (JS/CSS/imágenes) acumulados en
 * memoria por asset-hits.ts -- ver ese módulo para por qué se baten en
 * lote en vez de escribir uno por request. */
export async function addAssetHits(ip: string, count: number): Promise<void> {
  if (count <= 0) return;
  await prisma.ipScore.upsert({
    where: { ip },
    update: { assetHits: { increment: count } },
    create: { ip, assetHits: count },
  });
}

export async function verifyAndScoreCrawler(ip: string, crawler: ClaimedCrawler): Promise<void> {
  const status = await verifyClaimedCrawler(ip, crawler);
  if (status === "verified") {
    await prisma.ipScore.upsert({
      where: { ip },
      update: { verifiedBot: true, botName: crawler.name },
      create: { ip, verifiedBot: true, botName: crawler.name, score: 0, state: "humano" },
    });
    return;
  }
  if (status === "failed") {
    await recordSignals(ip, [
      {
        key: "unverified_crawler_ua",
        detail: `Se presenta como ${crawler.name} pero el reverse-DNS no coincide con ${crawler.verifyDomains.join(", ")}`,
      },
    ]);
  }
  // status === "error": timeout o sin PTR -- no se penaliza (ver bot-verify.ts).
}

const lastAggregateAt = new Map<string, number>();
const pendingAggregateTimer = new Map<string, ReturnType<typeof setTimeout>>();
const AGGREGATE_DEBOUNCE_MS = 5_000;
const AGGREGATE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Señales que necesitan mirar el historial reciente de la IP (velocidad,
 * varianza de intervalos, IDs secuenciales, ratio de assets...). Se corre
 * en segundo plano vía after(), no bloquea la respuesta.
 *
 * Debounce de "flanco de salida": si una ráfaga de requests termina antes
 * de que pasen los AGGREGATE_DEBOUNCE_MS, no alcanza con "ignorar y listo"
 * -- eso dejaba el puntaje agregado congelado con los datos parciales del
 * primer request de la ráfaga para siempre, porque nada volvía a llamar a
 * esta función una vez que dejaban de llegar requests. Se detectó
 * probando el fix de paginación por query string: un scraper de 8
 * requests en ~1.2s nunca llegaba a puntuar sequential_id_walk. Ahora, si
 * hay una llamada bloqueada por el debounce, se programa una pasada final
 * para cuando termine la ventana, así siempre corre al menos una vez más
 * con los datos completos de la ráfaga.
 */
export async function runAggregateSignals(ip: string): Promise<void> {
  const now = Date.now();
  const elapsed = now - (lastAggregateAt.get(ip) ?? 0);

  if (elapsed >= AGGREGATE_DEBOUNCE_MS) {
    lastAggregateAt.set(ip, now);
    await runAggregateSignalsNow(ip);
    return;
  }

  if (!pendingAggregateTimer.has(ip)) {
    const timer = setTimeout(() => {
      pendingAggregateTimer.delete(ip);
      lastAggregateAt.set(ip, Date.now());
      runAggregateSignalsNow(ip).catch(() => {});
    }, AGGREGATE_DEBOUNCE_MS - elapsed);
    timer.unref();
    pendingAggregateTimer.set(ip, timer);
  }
}

async function runAggregateSignalsNow(ip: string): Promise<void> {
  const config = await getScoringConfig();
  const windowStart = new Date(Date.now() - AGGREGATE_WINDOW_MS);

  const [ipScore, visits] = await Promise.all([
    prisma.ipScore.findUnique({ where: { ip } }),
    prisma.visit.findMany({
      where: { ip, createdAt: { gte: windowStart }, isAdmin: false },
      select: { id: true, fingerprint: true, referrer: true },
      take: 300,
    }),
  ]);
  if (!ipScore || ipScore.whitelisted || ipScore.verifiedBot) return;
  if (visits.length === 0) return;

  // pageViews viene del beacon de JS (PageViewTracker) -- sirve para
  // "¿corrió JavaScript?" y para el referrer (document.referrer, solo
  // disponible del lado del cliente). Para velocidad/varianza/IDs
  // secuenciales se usa el log crudo de hits del proxy (request-log.ts),
  // que existe con o sin JS -- si dependiera de pageViews, un scraper que
  // nunca ejecuta JS (el caso más común) sería invisible para esas
  // señales, justo las que más lo deberían atrapar.
  const pageViews = await prisma.pageView.findMany({
    where: { visitId: { in: visits.map((v) => v.id) } },
    select: { path: true, referrer: true, createdAt: true },
    orderBy: { createdAt: "asc" },
    take: 1000,
  });
  const hits = getRecentHits(ip, AGGREGATE_WINDOW_MS);

  const signals: RawSignal[] = [];

  // Ausencia de ejecución de JS: hits HTML acumulados sin ni un solo
  // beacon de pageview -- formaliza la heurística que ya usaba
  // analytics.ts (visitas con 0 pageViews).
  if (ipScore.htmlHits >= 3 && pageViews.length === 0) {
    signals.push({ key: "no_js_execution", detail: `${ipScore.htmlHits} hits HTML, 0 pageviews con JS` });
  }

  if (pageViews.length >= 3) {
    const distinctPageViewPaths = new Set(pageViews.map((p) => p.path));
    const allReferrerless = pageViews.slice(1).every((p) => !p.referrer);
    if (distinctPageViewPaths.size >= 3 && allReferrerless && visits.every((v) => !v.referrer)) {
      signals.push({
        key: "no_referrer_deep_nav",
        detail: `${distinctPageViewPaths.size} páginas visitadas sin referrer interno en ninguna`,
      });
    }
  }

  if (hits.length >= 5) {
    const intervals: number[] = [];
    for (let i = 1; i < hits.length; i++) intervals.push(hits[i].at - hits[i - 1].at);
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length;
    const stddev = Math.sqrt(variance);
    const spanMinutes = (hits[hits.length - 1].at - hits[0].at) / 60_000;

    if (mean > 0 && stddev / mean < 0.2) {
      signals.push({
        key: "low_interval_variance",
        detail: `desvío estándar ${Math.round(stddev)}ms sobre un promedio de ${Math.round(mean)}ms sobre ${intervals.length} intervalos`,
      });
    }

    // Umbrales de velocidad/amplitud calibrados con una sesión "humana
    // rápida" real (paginando 8 páginas con jitter de 0.6-2.6s entre
    // clicks): esa sesión legítima llegaba a ~35-40 req/min y ~35-40
    // páginas distintas/min. Los umbrales originales (30 y 20) la
    // marcaban como scraper. Se subieron y se exige más muestra (10, no
    // 5) para no reaccionar a una ráfaga corta de clicks rápidos.
    if (hits.length >= 10 && spanMinutes > 0 && hits.length / spanMinutes > 90) {
      signals.push({
        key: "high_velocity",
        detail: `${hits.length} páginas en ${spanMinutes.toFixed(1)} min`,
      });
    }

    const distinctPaths = new Set(hits.map((h) => h.path));
    if (hits.length >= 10 && spanMinutes > 0 && spanMinutes < 3 && distinctPaths.size / spanMinutes > 40) {
      signals.push({
        key: "high_breadth_low_time",
        detail: `${distinctPaths.size} URLs distintas en ${spanMinutes.toFixed(1)} min`,
      });
    }

    // Este sitio SÍ pagina por query string real (?page=2, ?page=3...) en
    // /videos, /new-releases, /recent-uploads, /random -- a diferencia de
    // un ID de path inventado, recorrer esas páginas en orden es algo que
    // hace tanto un humano paginando rápido como Googlebot indexando el
    // catálogo. Por eso esta señal exige ADEMÁS que no haya corrido ni un
    // solo beacon de JS en toda la ventana (mismo chequeo que
    // no_js_execution) -- un navegador real o un crawler que renderiza JS
    // (Googlebot moderno) dispara el beacon en cada pageview, paginación
    // incluida, así que ese combo casi no da falsos positivos.
    const noJsInWindow = ipScore.htmlHits >= 3 && pageViews.length === 0;
    const ids = hits
      .map((h) => extractSequenceNumber(h.path))
      .filter((n): n is number => n !== null);
    let bestRun = 1;
    let currentRun = 1;
    for (let i = 1; i < ids.length; i++) {
      currentRun = Math.abs(ids[i] - ids[i - 1]) === 1 ? currentRun + 1 : 1;
      bestRun = Math.max(bestRun, currentRun);
    }
    if (bestRun >= 5 && noJsInWindow) {
      signals.push({ key: "sequential_id_walk", detail: `${bestRun} IDs/páginas consecutivas recorridas en orden, sin JS` });
    }
  }

  // + getPendingAssetHits: assetHits se escribe en lote cada 15s
  // (asset-hits.ts) pero este paso corre casi al instante -- sin sumar lo
  // pendiente, cualquier sesión real parece "0 assets" en sus primeros
  // segundos. Solo se usa zero_asset_ratio, no un ratio con umbral: un
  // navegador real cachea JS/CSS (immutable) y no vuelve a pedirlos en la
  // misma sesión, así que "assets/HTML < X" baja solo en cualquier
  // sesión real suficientemente larga -- no es un scraper, es el caché
  // funcionando. "Cero assets en absoluto" sí se mantiene confiable
  // sin importar cuánto dure la sesión.
  const assetHits = ipScore.assetHits + getPendingAssetHits(ip);
  if (ipScore.htmlHits >= 5 && assetHits === 0) {
    signals.push({ key: "zero_asset_ratio", detail: `${ipScore.htmlHits} páginas HTML, 0 recursos estáticos` });
  }

  const fingerprint = ipScore.fingerprint ?? visits.find((v) => v.fingerprint)?.fingerprint;
  if (fingerprint) {
    const rotatingIps = await prisma.ipScore.findMany({
      where: { fingerprint, lastSeenAt: { gte: windowStart } },
      select: { ip: true },
    });
    if (rotatingIps.length >= 4) {
      signals.push({
        key: "fingerprint_ip_rotation",
        detail: `misma huella de headers vista en ${rotatingIps.length} IPs distintas`,
      });
    }
  }

  if (signals.length > 0) await recordSignals(ip, signals);
  await purgeOldData(config);
}

let lastPurgeAt = 0;
const PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Purga liviana en vez de un cron dedicado (este proyecto no tiene job
 * scheduler): se aprovecha el paso agregado, que ya corre en segundo
 * plano, para revisar cada tantas horas si toca borrar señales viejas y
 * anonimizar IPs viejas en el módulo de visitas existente. */
async function purgeOldData(config: ScoringConfig): Promise<void> {
  if (Date.now() - lastPurgeAt < PURGE_INTERVAL_MS) return;
  lastPurgeAt = Date.now();
  const cutoff = new Date(Date.now() - config.retentionDays * 24 * 60 * 60 * 1000);
  await prisma.scoreSignal.deleteMany({ where: { createdAt: { lt: cutoff } } }).catch(() => {});
  await anonymizeOldVisitIps(config).catch(() => {});
}

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/;

/** Restricción sección 5: "opción de anonimizar el último octeto de la
 * IP en los registros históricos". Desactivado por default
 * (anonymizeVisitIpAfterDays: 0); aplica solo a Visit.ip -- el módulo de
 * visitas preexistente -- porque IpScore/ScoreSignal usan la IP exacta
 * como clave del puntaje y no se pueden anonimizar sin romper la
 * detección (ver el comentario en config.ts). Procesa de a lotes chicos
 * para no bloquear el event loop si hay muchas visitas viejas. */
async function anonymizeOldVisitIps(config: ScoringConfig): Promise<void> {
  if (config.anonymizeVisitIpAfterDays <= 0) return;
  const cutoff = new Date(Date.now() - config.anonymizeVisitIpAfterDays * 24 * 60 * 60 * 1000);

  const candidates = await prisma.visit.findMany({
    where: { createdAt: { lt: cutoff }, ip: { not: null } },
    select: { id: true, ip: true },
    take: 500,
  });

  const updates = candidates
    .map((v) => {
      const match = v.ip!.match(IPV4_RE);
      if (!match) return null; // no es IPv4, o ya está anonimizada (termina en .0 pero no matchea si ya se hizo antes de más)
      const anonymized = `${match[1]}.${match[2]}.${match[3]}.0`;
      if (anonymized === v.ip) return null; // ya anonimizada
      return prisma.visit.update({ where: { id: v.id }, data: { ip: anonymized } });
    })
    .filter((u): u is NonNullable<typeof u> => u !== null);

  if (updates.length) await prisma.$transaction(updates);
}
