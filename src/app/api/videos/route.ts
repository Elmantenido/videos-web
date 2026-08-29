import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PUBLIC_VIDEO_SELECT } from "@/lib/video-select";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;
  const take = Number(searchParams.get("take") ?? 24);
  const cursor = searchParams.get("cursor");

  const videos = await prisma.video.findMany({
    where: {
      published: true,
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { studio: { contains: q } },
              { description: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    ...(cursor ? { skip: 1, cursor: { id: Number(cursor) } } : {}),
    select: PUBLIC_VIDEO_SELECT,
  });

  return NextResponse.json({ videos });
}
