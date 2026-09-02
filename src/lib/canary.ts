import { createHash } from "crypto";

/**
 * Marca invisible y determinística por video+día (spec: "contenido
 * canario"). No se guarda en base -- se recalcula cada vez, así que no
 * hace falta migración ni limpieza. Si un mismo bloque de descripción
 * aparece copiado en otro sitio, este token permite ubicar de qué video y
 * de qué fecha salió la copia. Cubre el caso común de scraping que copia
 * el bloque de descripción completo (incluyendo su wrapper); no sobrevive
 * si el scraper extrae solo el texto plano del <p>, ignorando el resto
 * del DOM alrededor -- ese caso requeriría un watermark de caracteres
 * invisibles dentro del propio texto, que queda fuera de esta fase.
 */
export function canaryMarker(videoId: number): string {
  const day = new Date().toISOString().slice(0, 10);
  const hash = createHash("sha256").update(`${videoId}:${day}`).digest("hex").slice(0, 16);
  return `cnry-${videoId}-${day}-${hash}`;
}
