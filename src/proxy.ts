import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { ensureVisit, clientIp } from "@/lib/visit";
import { recordAssetHit } from "@/lib/scoring/asset-hits";
import { scheduleScoring } from "@/lib/scoring/request";

// A diferencia del matcher anterior, este SÍ deja pasar _next/static y
// _next/image -- el motor de detección de scraping necesita ver esos
// hits para medir el ratio de recursos estáticos vs. HTML (la señal más
// discriminante contra scrapers). La rama de "es un asset" de abajo es
// intencionalmente barata (sin Prisma, sin await) para no meterle
// latencia a esos requests.
export const config = {
  matcher: ["/((?!api|favicon.ico).*)"],
};

const ASSET_RE =
  /^\/_next\/(static|image)\/|\.(?:css|js|mjs|map|woff2?|ttf|eot|png|jpe?g|gif|webp|avif|svg)$/i;

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (ASSET_RE.test(pathname)) {
    const ip = clientIp(req);
    if (ip) recordAssetHit(ip);
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
