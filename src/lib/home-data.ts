import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { getTrending } from "@/lib/views";
import { PUBLIC_VIDEO_SELECT } from "@/lib/video-select";

export const CAROUSEL_PAGE_SIZE = 5;

export async function getHomeData() {
  const [latestVideos, newReleases, randomVideos, totalVideos, categories, settings, trending] =
    await Promise.all([
      prisma.video.findMany({
        where: { published: true },
        orderBy: { createdAt: "desc" },
        take: CAROUSEL_PAGE_SIZE,
        select: PUBLIC_VIDEO_SELECT,
      }),
      prisma.video.findMany({
        where: { published: true, releasedAt: { not: null } },
        orderBy: { releasedAt: "desc" },
        take: CAROUSEL_PAGE_SIZE,
        select: PUBLIC_VIDEO_SELECT,
      }),
      prisma.video
        .findMany({ where: { published: true }, select: PUBLIC_VIDEO_SELECT })
        .then((all) => all.sort(() => Math.random() - 0.5).slice(0, CAROUSEL_PAGE_SIZE)),
      prisma.video.count({ where: { published: true } }),
      prisma.category.findMany({ orderBy: { name: "asc" } }),
      getSiteSettings(),
      getTrending("today", 10),
    ]);

  return { latestVideos, newReleases, randomVideos, totalVideos, categories, settings, trending };
}
