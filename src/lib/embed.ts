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
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, "")
    .replace(/<video\b([^>]*)>/gi, (match, attrs: string) => {
      // Hides the native browser "download" button on <video> controls and
      // blocks the right-click "Save video as" menu. This does NOT and
      // cannot hide the file URL from someone using devtools/network
      // inspection -- the browser must load that URL to play the video,
      // so it's always visible in the DOM once play starts. It only stops
      // the casual copy-the-link-via-right-click path.
      const extra =
        ' controlsList="nodownload noremoteplayback" disablepictureinpicture oncontextmenu="return false;"';
      return `<video${attrs}${extra}>`;
    });
}
