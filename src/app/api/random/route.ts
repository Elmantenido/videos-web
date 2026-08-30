import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PUBLIC_VIDEO_SELECT } from "@/lib/video-select";

// Hard cap so a crafted ?take= value can't force this endpoint to pull the
// whole catalog. The old implementation loaded every published video (with
// no LIMIT at all) into memory and shuffled the full array in JS on every
// call -- cost grew with total catalog size, not with what was requested.
const MAX_TAKE = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const take = Math.min(Math.max(Number(searchParams.get("take") ?? 24) || 24, 1), MAX_TAKE);
  const excludeIds = (searchParams.get("excludeIds") ?? "")
    .split(",")
    .map((id) => Number(id))
    .filter((id) => !Number.isNaN(id));

  const excludeClause = excludeIds.length
    ? Prisma.sql`AND id NOT IN (${Prisma.join(excludeIds)})`
    : Prisma.empty;

  // SQLite can pick a random sample at the SQL level (ORDER BY RANDOM()
  // LIMIT n) far cheaper than transferring every row and shuffling in JS.
  const rows = await prisma.$queryRaw<{ id: number }[]>(
    Prisma.sql`SELECT id FROM Video WHERE published = 1 ${excludeClause} ORDER BY RANDOM() LIMIT ${take}`
  );
  const ids = rows.map((r) => r.id);

  const videos = await prisma.video.findMany({
    where: { id: { in: ids } },
    select: PUBLIC_VIDEO_SELECT,
  });
  const byId = new Map(videos.map((v) => [v.id, v]));
  const ordered = ids
    .map((id) => byId.get(id))
    .filter((v): v is (typeof videos)[number] => v !== undefined);

  return NextResponse.json(
    { videos: ordered },
    { headers: { "Cache-Control": "no-store" } }
  );
}
