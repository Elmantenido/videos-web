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

export async function touchOrCreateVisit(req: NextRequest, res: NextResponse) {
  const pathname = req.nextUrl.pathname;
  const isAdmin = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  const existingId = req.cookies.get(VISIT_COOKIE)?.value;

  if (existingId) {
    try {
      await prisma.$transaction([
        prisma.visit.update({
          where: { id: existingId },
          data: { lastSeenAt: new Date(), ...(isAdmin ? { isAdmin: true } : {}) },
        }),
        prisma.pageView.create({ data: { visitId: existingId, path: pathname } }),
      ]);
      res.cookies.set(VISIT_COOKIE, existingId, {
        maxAge: SESSION_WINDOW_SECONDS,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
      });
      return;
    } catch {
      // visit id from an old/cleared database — fall through and create a new one
    }
  }

  const id = crypto.randomUUID();
  const ip = clientIp(req);
  const referrer = req.headers.get("referer") || null;
  const country = await lookupCountry(ip);

  await prisma.visit.create({
    data: { id, landingPage: pathname, referrer, country, isAdmin },
  });
  await prisma.pageView.create({ data: { visitId: id, path: pathname } });

  res.cookies.set(VISIT_COOKIE, id, {
    maxAge: SESSION_WINDOW_SECONDS,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
}
