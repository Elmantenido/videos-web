import { prisma } from "@/lib/prisma";

export type TrendingRange = "today" | "week" | "month" | "all";

export async function recordView(videoId: number) {
  await Promise.all([
    prisma.video.update({ where: { id: videoId }, data: { views: { increment: 1 } } }),
    prisma.videoView.create({ data: { videoId } }),
  ]);
}

function rangeStart(range: TrendingRange): Date | null {
  const now = new Date();
  if (range === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (range === "week") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (range === "month") {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return null;
}

export type TrendingVideo = {
  id: number;
  slug: string;
  title: string;
  studio: string | null;
  thumbnail: string | null;
  viewCount: number;
};

export async function getTrending(range: TrendingRange, take = 10): Promise<TrendingVideo[]> {
  const since = rangeStart(range);

  if (!since) {
    const videos = await prisma.video.findMany({
      where: { published: true },
      orderBy: { views: "desc" },
      take,
    });
    return videos.map((v) => ({
      id: v.id,
      slug: v.slug,
      title: v.title,
      studio: v.studio,
      thumbnail: v.thumbnail,
      viewCount: v.views,
    }));
  }

  const grouped = await prisma.videoView.groupBy({
    by: ["videoId"],
    where: { createdAt: { gte: since } },
    _count: { videoId: true },
    orderBy: { _count: { videoId: "desc" } },
    take,
  });

  if (grouped.length === 0) return [];

  const videos = await prisma.video.findMany({
    where: { id: { in: grouped.map((g) => g.videoId) }, published: true },
  });
  const videoById = new Map(videos.map((v) => [v.id, v]));

  return grouped
    .map((g) => {
      const video = videoById.get(g.videoId);
      if (!video) return null;
      return {
        id: video.id,
        slug: video.slug,
        title: video.title,
        studio: video.studio,
        thumbnail: video.thumbnail,
        viewCount: g._count.videoId,
      };
    })
    .filter((v): v is TrendingVideo => v !== null);
}
