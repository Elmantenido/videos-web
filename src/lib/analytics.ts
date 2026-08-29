import { prisma } from "@/lib/prisma";

export type VisitRow = {
  id: string;
  createdAt: Date;
  country: string | null;
  landingPage: string;
  referrer: string | null;
  isAdmin: boolean;
  playsCount: number;
  durationSeconds: number;
};

export async function getVisits(from: Date, to: Date): Promise<VisitRow[]> {
  const visits = await prisma.visit.findMany({
    where: { createdAt: { gte: from, lte: to } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return visits.map((v) => ({
    id: v.id,
    createdAt: v.createdAt,
    country: v.country,
    landingPage: v.landingPage,
    referrer: v.referrer,
    isAdmin: v.isAdmin,
    playsCount: v.playsCount,
    durationSeconds: Math.max(
      0,
      Math.round((v.lastSeenAt.getTime() - v.createdAt.getTime()) / 1000)
    ),
  }));
}

export async function getSummary(from: Date, to: Date) {
  const [visits, pageViews, plays] = await Promise.all([
    prisma.visit.count({ where: { createdAt: { gte: from, lte: to } } }),
    prisma.pageView.count({ where: { createdAt: { gte: from, lte: to } } }),
    prisma.videoView.count({ where: { createdAt: { gte: from, lte: to } } }),
  ]);
  return { visits, pageViews, plays };
}

export type MinuteBucket = {
  label: string;
  visits: number;
  pageViews: number;
  plays: number;
};

const BUCKET_MINUTES = 5;
const BUCKET_COUNT = 6; // 6 x 5min = last 30 minutes

export async function getLast30MinBuckets(): Promise<MinuteBucket[]> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - BUCKET_COUNT * BUCKET_MINUTES * 60 * 1000);

  const [visits, pageViews, plays] = await Promise.all([
    prisma.visit.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { createdAt: true },
    }),
    prisma.pageView.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { createdAt: true },
    }),
    prisma.videoView.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { createdAt: true },
    }),
  ]);

  const buckets: MinuteBucket[] = [];
  for (let i = BUCKET_COUNT - 1; i >= 0; i--) {
    const bucketEnd = new Date(now.getTime() - i * BUCKET_MINUTES * 60 * 1000);
    const bucketStart = new Date(bucketEnd.getTime() - BUCKET_MINUTES * 60 * 1000);

    const inBucket = (d: Date) => d >= bucketStart && d < bucketEnd;

    buckets.push({
      label: bucketStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      visits: visits.filter((v) => inBucket(v.createdAt)).length,
      pageViews: pageViews.filter((p) => inBucket(p.createdAt)).length,
      plays: plays.filter((p) => inBucket(p.createdAt)).length,
    });
  }

  return buckets;
}
