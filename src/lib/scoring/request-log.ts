// Ring buffer en memoria de los últimos hits HTML por IP (path + hora).
// Las señales de velocidad/varianza/IDs secuenciales necesitan timing por
// request, y la mayoría de los scrapers nunca corren el beacon de JS
// (PageView), así que no puede depender de esa tabla -- tiene que ver el
// hit crudo del proxy, con o sin JS. Vive solo en memoria (mismo patrón
// que rate-limit.ts): un solo proceso PM2, se resetea si el server
// reinicia, y evita tanto una escritura a base por request como una
// migración nueva solo para esto.
type Hit = { path: string; at: number };

const MAX_HITS_PER_IP = 200;
const MAX_TRACKED_IPS = 5000;
const IP_IDLE_TTL_MS = 24 * 60 * 60 * 1000;

const hitsByIp = new Map<string, Hit[]>();
const lastTouchedByIp = new Map<string, number>();

export function recordHit(ip: string, path: string): void {
  const now = Date.now();
  const hits = hitsByIp.get(ip) ?? [];
  hits.push({ path, at: now });
  if (hits.length > MAX_HITS_PER_IP) hits.splice(0, hits.length - MAX_HITS_PER_IP);
  hitsByIp.set(ip, hits);
  lastTouchedByIp.set(ip, now);

  // Poda oportunista: si por rotación de IPs (o un ataque) el mapa crece
  // demasiado, se tira lo más viejo en vez de dejarlo crecer sin límite.
  if (hitsByIp.size > MAX_TRACKED_IPS) {
    const oldestIp = [...lastTouchedByIp.entries()].sort((a, b) => a[1] - b[1])[0]?.[0];
    if (oldestIp) {
      hitsByIp.delete(oldestIp);
      lastTouchedByIp.delete(oldestIp);
    }
  }
}

export function getRecentHits(ip: string, windowMs: number): Hit[] {
  const hits = hitsByIp.get(ip);
  if (!hits) return [];
  const cutoff = Date.now() - windowMs;
  return hits.filter((h) => h.at >= cutoff);
}

setInterval(
  () => {
    const cutoff = Date.now() - IP_IDLE_TTL_MS;
    for (const [ip, last] of lastTouchedByIp) {
      if (last < cutoff) {
        hitsByIp.delete(ip);
        lastTouchedByIp.delete(ip);
      }
    }
  },
  60 * 60 * 1000
).unref();
