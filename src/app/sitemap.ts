import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

// Without this, Next.js treats sitemap.ts as fully static (Prisma calls
// aren't a "request-time" signal the way fetch/cookies() are), so it gets
// generated once at build time and frozen -- new videos/categories never
// show up until the next deploy. Force it to run fresh on every request.
export const dynamic = "force-dynamic";

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
