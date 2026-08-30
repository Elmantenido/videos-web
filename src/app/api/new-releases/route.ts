import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PUBLIC_VIDEO_SELECT } from "@/lib/video-select";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const take = Number(searchParams.get("take") ?? 24);
  const skip = Number(searchParams.get("skip") ?? 0);

  // releasedAt isn't tied to id/creation order, so pagination here uses a
  // plain offset instead of the id-based cursor the other list endpoints use.
  const videos = await prisma.video.findMany({
    where: { published: true, releasedAt: { not: null } },
    orderBy: { releasedAt: "desc" },
    take,
    skip,
    select: PUBLIC_VIDEO_SELECT,
  });

  return NextResponse.json({ videos });
}
