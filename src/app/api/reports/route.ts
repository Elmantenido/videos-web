import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const videoId = Number(body.videoId);
  const message = String(body.message ?? "").trim();
  const contactEmail = String(body.contactEmail ?? "").trim();
  const diagnostics = body.diagnostics ? JSON.stringify(body.diagnostics) : null;

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
