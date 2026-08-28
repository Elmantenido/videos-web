export function isEmbedUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

/**
 * El código de embed lo pega el propio administrador (no un usuario público),
 * pero igual quitamos <script> y manejadores on* por si el snippet viene
 * copiado de una fuente poco confiable.
 */
export function sanitizeEmbedCode(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, "");
}
