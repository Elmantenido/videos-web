import { HONEYPOT_PATH_PREFIX } from "@/lib/scoring/request";

/**
 * Trampa activa (spec sección 1): un link invisible para humanos que
 * robots.txt bloquea explícitamente. Un navegador real nunca lo muestra
 * (display:none) y un crawler que respete robots.txt nunca lo sigue --
 * cualquier hit acá es casi con certeza un script que parsea el HTML
 * crudo ignorando ambas señales. Se usa <a> plano (no next/link) para que
 * el prefetch de Next nunca lo visite por accidente y auto-dispare la
 * trampa contra el propio sitio.
 */
export default function HoneypotLink() {
  return (
    <a
      href={HONEYPOT_PATH_PREFIX}
      rel="nofollow"
      aria-hidden="true"
      tabIndex={-1}
      style={{ display: "none" }}
    >
      Full catalog index
    </a>
  );
}
