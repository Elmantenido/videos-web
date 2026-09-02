import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { VISIT_COOKIE, SESSION_WINDOW_SECONDS } from "@/lib/visit";

export async function POST(req: NextRequest) {
  const store = await cookies();
  const visitId = store.get(VISIT_COOKIE)?.value;
  if (!visitId) return NextResponse.json({ ok: false });

  const body = await req.json().catch(() => ({}));
  const path = typeof body.path === "string" ? body.path : "/";
  const referrer = typeof body.referrer === "string" ? body.referrer : null;

  await Promise.all([
    prisma.pageView.create({ data: { visitId, path, referrer } }).catch(() => {}),
    prisma.visit
      .update({ where: { id: visitId }, data: { lastSeenAt: new Date() } })
      .catch(() => {}),
  ]);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(VISIT_COOKIE, visitId, {
    maxAge: SESSION_WINDOW_SECONDS,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
  return res;
}
