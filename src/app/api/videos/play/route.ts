import { NextRequest, NextResponse } from "next/server";
import { recordView } from "@/lib/views";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const videoId = Number(body.videoId);

  if (!videoId || Number.isNaN(videoId)) {
    return NextResponse.json({ error: "videoId is required" }, { status: 400 });
  }

  await recordView(videoId);
  return NextResponse.json({ ok: true });
}
