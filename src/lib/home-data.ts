import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { getTrending } from "@/lib/views";

export const CAROUSEL_PAGE_SIZE = 5;

export async function getHomeData() {
  const [latestVideos, randomVideos, totalVideos, categories, settings, trending] =
    await Promise.all([
      prisma.video.findMany({
        where: { published: true },
        orderBy: { createdAt: "desc" },
        take: CAROUSEL_PAGE_SIZE,
      }),
      prisma.video
        .findMany({ where: { published: true } })
        .then((all) => all.sort(() => Math.random() - 0.5).slice(0, CAROUSEL_PAGE_SIZE)),
      prisma.video.count({ where: { published: true } }),
      prisma.category.findMany({ orderBy: { name: "asc" } }),
      getSiteSettings(),
      getTrending("today", 10),
    ]);

  return { latestVideos, randomVideos, totalVideos, categories, settings, trending };
}
