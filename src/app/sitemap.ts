import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const [videos, categories] = await Promise.all([
    prisma.video.findMany({
      where: { published: true },
      select: { slug: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({ select: { slug: true } }),
  ]);

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/explore`, changeFrequency: "daily", priority: 0.8 },
    ...categories.map((c) => ({
      url: `${base}/categoria/${c.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    ...videos.map((v) => ({
      url: `${base}/video/${v.slug}`,
      lastModified: v.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
