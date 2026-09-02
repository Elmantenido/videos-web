import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { ensureVisit, clientIp } from "@/lib/visit";
import { recordAssetHit } from "@/lib/scoring/asset-hits";
import { scheduleScoring, scheduleApiScoring } from "@/lib/scoring/request";

// Deja pasar TODO menos favicon.ico -- ni _next/static/_next/image (el
// motor necesita verlos para el ratio de assets) ni /api (necesita
// verlos para detectar acceso directo a endpoints de datos). Ambos casos
// se resuelven en ramas baratas más abajo, sin tocar ensureVisit() ni la
// lógica propia de cada ruta de /api.
export const config = {
  matcher: ["/((?!favicon.ico).*)"],
};

// _next/image (el optimizador de imágenes de Next) es exactamente
// "/_next/image" con querystring, SIN barra ni nada después -- a
// diferencia de _next/static/<hash>. Iba sin `(?:\/|$)` en la primera
// versión, así que nunca hacía match y esos requests (si el sitio
// llegara a usar next/image) habrían caído en la rama de ensureVisit()
// como si fueran HTML, inflando htmlHits. Hoy el sitio no usa next/image
// (usa <img> plano a propósito, ver los eslint-disable en video/[slug]),
// así que no tuvo impacto real, pero queda bien para cuando se use.
const ASSET_RE =
  /^\/_next\/(?:static|image)(?:\/|$)|\.(?:css|js|mjs|map|woff2?|ttf|eot|png|jpe?g|gif|webp|avif|svg)$/i;

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (ASSET_RE.test(pathname)) {
    const ip = clientIp(req);
    if (ip) recordAssetHit(ip);
    return NextResponse.next();
  }

  // Las rutas de /api manejan su propia autenticación (ADMIN_KEY, sesión,
  // etc.) -- acá solo se agrega puntaje, sin tocar el resto del flujo
  // (sin ensureVisit, sin cookie de visita, sin redirect de /admin).
  if (pathname.startsWith("/api/")) {
    const ip = clientIp(req);
    const isAdminNow = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
    if (!isAdminNow) scheduleApiScoring(req, ip, pathname);
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!verifySessionToken(token)) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  const res = NextResponse.next();
  await ensureVisit(req, res);

  // La navegación de un admin autenticado nunca debe sumar puntaje a su
  // propia IP -- funciona como whitelist automática mientras hay sesión
  // iniciada. Una whitelist explícita de IPs llega en la fase de interfaz.
  const isAdminNow = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!isAdminNow) {
    scheduleScoring(req, clientIp(req), pathname);
  }

  return res;
}
