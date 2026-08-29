import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isEmbedUrl, sanitizeEmbedCode } from "@/lib/embed";
import { recordView } from "@/lib/views";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const videoId = Number(body.videoId);

  if (!videoId || Number.isNaN(videoId)) {
    return NextResponse.json({ error: "videoId is required" }, { status: 400 });
  }

  const video = await prisma.video.findUnique({
    where: { id: videoId, published: true },
    select: { embedUrl: true },
  });
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  await recordView(videoId);

  const isHtml = !isEmbedUrl(video.embedUrl);
  const raw = isHtml ? sanitizeEmbedCode(video.embedUrl) : video.embedUrl;
  const payload = Buffer.from(raw, "utf-8").toString("base64");

  return NextResponse.json({ isHtml, payload });
}
