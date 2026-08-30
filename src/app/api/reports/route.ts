import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const videoId = Number(body.videoId);
  // This is a public, unauthenticated endpoint -- cap every field before it
  // reaches the database so a crafted request can't bloat storage with a
  // handful of oversized rows.
  const message = String(body.message ?? "").trim().slice(0, 5000);
  const contactEmail = String(body.contactEmail ?? "").trim().slice(0, 200);
  const diagnostics = body.diagnostics ? JSON.stringify(body.diagnostics).slice(0, 2000) : null;

  if (!videoId || Number.isNaN(videoId) || !message) {
    return NextResponse.json(
      { error: "videoId y message son obligatorios" },
      { status: 400 }
    );
  }

  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video) {
    return NextResponse.json({ error: "Video no encontrado" }, { status: 404 });
  }

  await prisma.report.create({
    data: {
      videoId,
      message,
      contactEmail: contactEmail || null,
      diagnostics,
    },
  });

  return NextResponse.json({ ok: true });
}
