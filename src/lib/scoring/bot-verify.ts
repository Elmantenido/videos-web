import { promises as dns } from "dns";
import type { ClaimedCrawler } from "@/lib/scoring/ua-classify";

const DNS_TIMEOUT_MS = 2000;
const POSITIVE_TTL_MS = 24 * 60 * 60 * 1000;
const NEGATIVE_TTL_MS = 60 * 60 * 1000;

export type VerifyStatus = "verified" | "failed" | "error";

type CacheEntry = { status: VerifyStatus; expiresAt: number };
const cache = new Map<string, CacheEntry>();

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("dns timeout")), DNS_TIMEOUT_MS)),
  ]);
}

/**
 * Reverse-DNS + forward-DNS de un IP que se presenta como un crawler
 * conocido (Googlebot, Bingbot, etc.) -- nunca confiamos en el
 * User-Agent solo. `status: "failed"` significa que el PTR resolvió a un
 * dominio que NO coincide con el operador que dice ser (spoofing casi
 * seguro). `status: "error"` (timeout, sin PTR, DNS caído) NO se penaliza
 * -- se prefiere un falso negativo ocasional a bloquear a Googlebot real
 * por un problema de DNS transitorio (restricción: cero falsos positivos
 * en crawlers de buscadores).
 */
export async function verifyClaimedCrawler(ip: string, crawler: ClaimedCrawler): Promise<VerifyStatus> {
  const cacheKey = `${ip}:${crawler.name}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.status;

  const status = await resolveStatus(ip, crawler);
  cache.set(cacheKey, {
    status,
    expiresAt: Date.now() + (status === "verified" ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS),
  });
  return status;
}

async function resolveStatus(ip: string, crawler: ClaimedCrawler): Promise<VerifyStatus> {
  let hostnames: string[];
  try {
    hostnames = await withTimeout(dns.reverse(ip));
  } catch {
    return "error";
  }
  if (hostnames.length === 0) return "error";

  const matchingHost = hostnames.find((h) =>
    crawler.verifyDomains.some((domain) => h === domain || h.endsWith(`.${domain}`))
  );
  if (!matchingHost) return "failed";

  // Confirma con forward DNS que ese hostname realmente resuelve de vuelta
  // al IP que hizo el request (evita confiar en un PTR mal configurado que
  // cualquiera puede apuntar a un dominio ajeno).
  try {
    const forward = await withTimeout(dns.resolve4(matchingHost).catch(() => dns.resolve6(matchingHost)));
    return forward.includes(ip) ? "verified" : "failed";
  } catch {
    return "error";
  }
}
