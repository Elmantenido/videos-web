import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lookupCountry } from "@/lib/geo";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export const VISIT_COOKIE = "visit_id";
export const SESSION_WINDOW_SECONDS = 30 * 60; // 30 min of inactivity = new visit

function clientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

/**
 * Runs on every matched request, including Next.js's automatic Link
 * prefetches — so this only ever CREATES the session cookie when missing.
 * It must not record a pageview or touch lastSeenAt, or every prefetched
 * link on a page would count as a real visit. Real pageviews are recorded
 * client-side instead (see /api/track/pageview), which only fires once a
 * page has actually mounted after a real navigation.
 */
export async function ensureVisit(req: NextRequest, res: NextResponse) {
  const existingId = req.cookies.get(VISIT_COOKIE)?.value;

  if (existingId) {
    const stillExists = await prisma.visit.findUnique({
      where: { id: existingId },
      select: { id: true },
    });
    if (stillExists) return;
  }

  const pathname = req.nextUrl.pathname;
  const isAdmin = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  const id = crypto.randomUUID();
  const ip = clientIp(req);
  const referrer = req.headers.get("referer") || null;
  const country = await lookupCountry(ip);

  await prisma.visit.create({
    data: { id, landingPage: pathname, referrer, country, isAdmin },
  });

  res.cookies.set(VISIT_COOKIE, id, {
    maxAge: SESSION_WINDOW_SECONDS,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
}
