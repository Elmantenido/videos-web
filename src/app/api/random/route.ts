import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const take = Number(searchParams.get("take") ?? 24);

  const videos = await prisma.video.findMany({
    where: { published: true },
    include: { categories: true },
  });

  const random = shuffle(videos).slice(0, take);

  return NextResponse.json(
    { videos: random },
    { headers: { "Cache-Control": "no-store" } }
  );
}
