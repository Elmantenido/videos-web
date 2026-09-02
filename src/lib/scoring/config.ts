import { cache } from "react";
import { prisma } from "@/lib/prisma";

// Todo el motor de puntaje lee sus pesos y umbrales de aquí. Los valores
// por defecto viven en código; un override completo o parcial se guarda
// como JSON en SiteSetting bajo SETTING_KEY, para que el futuro panel de
// configuración (fase 2) pueda cambiarlos "sin tocar código" simplemente
// escribiendo esa fila -- no hace falta ninguna migración nueva para eso.
export const SETTING_KEY = "scraping_detection_config";

export type SignalKey =
  | "empty_ua"
  | "library_ua"
  | "headless_browser_ua"
  | "unverified_crawler_ua"
  | "missing_accept_language"
  | "missing_accept_encoding"
  | "missing_sec_fetch"
  | "no_referrer_deep_nav"
  | "high_velocity"
  | "low_interval_variance"
  | "zero_asset_ratio"
  | "no_js_execution"
  | "sequential_id_walk"
  | "high_breadth_low_time"
  | "fingerprint_ip_rotation"
  | "honeypot"
  | "direct_api_access"
  | "suspicious_query_param";

export type ScoringConfig = {
  weights: Record<SignalKey, number>;
  thresholds: { observado: number; sospechoso: number; confirmado: number };
  /** Vida media de decaimiento del puntaje, en horas -- una IP no queda
   * marcada para siempre por una ráfaga aislada (ver engine.ts). */
  decayHalfLifeHours: number;
  /** Minutos mínimos entre dos disparos de la misma señal para la misma
   * IP; evita que una sola condición sostenida infle el puntaje request
   * tras request. */
  signalCooldownMinutes: number;
  /** Días de retención de ScoreSignal/PageView antes de purgarlos. */
  retentionDays: number;
  /** Opción de la sección 5 del pedido: anonimizar el último octeto de
   * Visit.ip para visitas más viejas que esto. 0 = desactivado (default).
   * No aplica a IpScore/ScoreSignal -- esas tablas usan la IP exacta como
   * clave primaria del puntaje, así que "anonimizarla" fusionaría IPs
   * distintas entre sí; su privacidad ya se resuelve con decaimiento +
   * purga (retentionDays) en vez de anonimización in-place. */
  anonymizeVisitIpAfterDays: number;
};

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: {
    empty_ua: 25,
    library_ua: 30,
    headless_browser_ua: 25,
    unverified_crawler_ua: 40,
    missing_accept_language: 8,
    missing_accept_encoding: 6,
    missing_sec_fetch: 15,
    no_referrer_deep_nav: 10,
    high_velocity: 20,
    low_interval_variance: 25,
    zero_asset_ratio: 35,
    no_js_execution: 30,
    sequential_id_walk: 30,
    high_breadth_low_time: 20,
    fingerprint_ip_rotation: 40,
    honeypot: 1000, // fuerza "confirmado" de inmediato, ver engine.ts
    direct_api_access: 25,
    suspicious_query_param: 15,
  },
  thresholds: { observado: 20, sospechoso: 50, confirmado: 90 },
  decayHalfLifeHours: 12,
  signalCooldownMinutes: 5,
  retentionDays: 90,
  anonymizeVisitIpAfterDays: 0,
};

export const getScoringConfig = cache(async (): Promise<ScoringConfig> => {
  const row = await prisma.siteSetting.findUnique({ where: { key: SETTING_KEY } });
  if (!row) return DEFAULT_SCORING_CONFIG;
  try {
    const override = JSON.parse(row.value);
    return {
      weights: { ...DEFAULT_SCORING_CONFIG.weights, ...override.weights },
      thresholds: { ...DEFAULT_SCORING_CONFIG.thresholds, ...override.thresholds },
      decayHalfLifeHours: override.decayHalfLifeHours ?? DEFAULT_SCORING_CONFIG.decayHalfLifeHours,
      signalCooldownMinutes:
        override.signalCooldownMinutes ?? DEFAULT_SCORING_CONFIG.signalCooldownMinutes,
      retentionDays: override.retentionDays ?? DEFAULT_SCORING_CONFIG.retentionDays,
      anonymizeVisitIpAfterDays:
        override.anonymizeVisitIpAfterDays ?? DEFAULT_SCORING_CONFIG.anonymizeVisitIpAfterDays,
    };
  } catch {
    return DEFAULT_SCORING_CONFIG;
  }
});

export function stateForScore(score: number, thresholds: ScoringConfig["thresholds"]): string {
  if (score >= thresholds.confirmado) return "confirmado";
  if (score >= thresholds.sospechoso) return "sospechoso";
  if (score >= thresholds.observado) return "observado";
  return "humano";
}
