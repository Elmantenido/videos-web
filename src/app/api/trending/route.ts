import { NextRequest, NextResponse } from "next/server";
import { getTrending, type TrendingRange } from "@/lib/views";

const VALID_RANGES: TrendingRange[] = ["today", "week", "month", "all"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rangeParam = searchParams.get("range") ?? "today";
  const range = (VALID_RANGES as string[]).includes(rangeParam)
    ? (rangeParam as TrendingRange)
    : "today";
  const take = Number(searchParams.get("take") ?? 10);
  const skip = Number(searchParams.get("skip") ?? 0);

  const videos = await getTrending(range, take, skip);
  return NextResponse.json({ range, videos });
}
