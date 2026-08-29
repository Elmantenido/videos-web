import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { VISIT_COOKIE } from "@/lib/visit";

export async function POST() {
  const store = await cookies();
  const visitId = store.get(VISIT_COOKIE)?.value;

  if (visitId) {
    await prisma.visit
      .update({ where: { id: visitId }, data: { lastSeenAt: new Date() } })
      .catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
