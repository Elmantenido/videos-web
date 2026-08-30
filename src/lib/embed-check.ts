import { isEmbedUrl } from "@/lib/embed";
import { browserHeaders } from "@/lib/browser-headers";

export type PlaybackCheckResult = { ok: boolean; reason: string };

/**
 * Fast, offline structural check: does the embed field contain something
 * that could plausibly play at all? Runs on every save so it never depends
 * on the target site being reachable (this project's VPS has previously
 * been IP-blocked by some source sites, so a network check can't be a
 * requirement for saving a video).
 */
export function validateEmbedFormat(rawEmbed: string): string | null {
  const embed = rawEmbed.trim();
  if (!embed) return "El campo embed está vacío.";

  if (isEmbedUrl(embed)) {
    try {
      const url = new URL(embed);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return `La URL usa un protocolo no soportado (${url.protocol}).`;
      }
    } catch {
      return "La URL del embed no es válida.";
    }
    return null;
  }

  const hasIframe = /<iframe\b[^>]*\bsrc\s*=\s*["'][^"']+["']/i.test(embed);
  const hasVideoSrc = /<(?:video|source)\b[^>]*\bsrc\s*=\s*["'][^"']+["']/i.test(embed);
  if (hasIframe || hasVideoSrc) return null;

  // sanitizeEmbedCode() strips <script> tags entirely before playback, so a
  // snippet that only contains a player <script> (e.g. a raw JWPlayer embed
  // code) would render nothing at all once sanitized.
  if (/<script\b/i.test(embed)) {
    return "El código solo contiene un <script>, que se elimina por seguridad al reproducir. Usa un <iframe> o <video> con su src.";
  }

  return "El código embed no es una URL ni contiene una etiqueta <iframe>/<video> reconocible.";
}

/** Pulls out the actual URL that would be requested during playback. */
export function extractPlaybackSrc(rawEmbed: string): string | null {
  const embed = rawEmbed.trim();
  if (isEmbedUrl(embed)) return embed;

  const iframeMatch = embed.match(/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i);
  if (iframeMatch) return iframeMatch[1];

  const videoMatch = embed.match(/<(?:video|source)\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i);
  if (videoMatch) return videoMatch[1];

  return null;
}

/**
 * Live check: actually requests the playback URL to see whether it's
 * reachable and looks like something a player could render. Only meant to
 * be triggered on demand (the "Verificar reproducción" button) since it
 * depends on the target site being reachable from this server.
 */
export async function checkEmbedPlayback(rawEmbed: string): Promise<PlaybackCheckResult> {
  const formatIssue = validateEmbedFormat(rawEmbed);
  if (formatIssue) return { ok: false, reason: formatIssue };

  const src = extractPlaybackSrc(rawEmbed);
  if (!src) return { ok: false, reason: "No se encontró una URL reproducible dentro del embed." };

  if (!/^https?:\/\//i.test(src) && !src.startsWith("//")) {
    return { ok: false, reason: "La URL extraída del embed es relativa (sin dominio); no se puede verificar." };
  }

  let url: URL;
  try {
    url = new URL(src.startsWith("//") ? `https:${src}` : src);
  } catch {
    return { ok: false, reason: "La URL extraída del embed no es válida." };
  }

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { ...browserHeaders(), Range: "bytes=0-2048" },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    res.body?.cancel().catch(() => {});

    if (!res.ok && res.status !== 206) {
      return { ok: false, reason: `El enlace respondió con estado ${res.status}.` };
    }

    const contentType = res.headers.get("content-type") ?? "";
    const looksPlayable =
      contentType === "" ||
      contentType.startsWith("video/") ||
      contentType.startsWith("text/html") ||
      contentType.includes("mpegurl") ||
      contentType.includes("dash+xml") ||
      contentType.includes("octet-stream");

    if (!looksPlayable) {
      return { ok: false, reason: `El enlace respondió, pero con un tipo de contenido inesperado ("${contentType}").` };
    }

    return { ok: true, reason: "El enlace respondió correctamente y parece reproducible." };
  } catch (err) {
    const message = err instanceof Error ? err.message : "error desconocido";
    return { ok: false, reason: `No se pudo conectar con el enlace: ${message}.` };
  }
}
