import { prisma } from "@/lib/prisma";
import { classifyUserAgent } from "@/lib/visitor-type";

// A real visit's client-side tracker (PageViewTracker) fires within
// milliseconds of the page mounting, so a visit with zero recorded page
// views essentially never ran our JavaScript at all -- almost always a
// plain HTTP client (curl, requests, a scraping script) rather than a
// browser, even when it fakes a browser-looking User-Agent.
const SUSPICIOUS_IP_VISIT_THRESHOLD = 15;

export type VisitRow = {
  id: string;
  createdAt: Date;
  country: string | null;
  landingPage: string;
  referrer: string | null;
  ip: string | null;
  playsCount: number;
  durationSeconds: number;
  isBot: boolean;
  visitorType: string;
  scrapingSignal: string | null;
};

export async function getVisits(from: Date, to: Date): Promise<VisitRow[]> {
  const [visits, ipCounts] = await Promise.all([
    prisma.visit.findMany({
      where: { createdAt: { gte: from, lte: to }, isAdmin: false },
      orderBy: { createdAt: "desc" },
      take: 500,
      include: { _count: { select: { pageViews: true } } },
    }),
    prisma.visit.groupBy({
      by: ["ip"],
      where: { createdAt: { gte: from, lte: to }, isAdmin: false, ip: { not: null } },
      _count: { id: true },
    }),
  ]);

  const ipCountByIp = new Map(ipCounts.map((row) => [row.ip, row._count.id]));

  return visits.map((v) => {
    const { isBot, label } = classifyUserAgent(v.userAgent);

    // Named bots (Googlebot, AhrefsBot, etc.) are already flagged via
    // visitorType -- this signal is specifically for traffic that passes
    // as "Usuario real" by User-Agent but behaves like a script.
    let scrapingSignal: string | null = null;
    if (!isBot) {
      if (v._count.pageViews === 0) {
        scrapingSignal = "Nunca ejecutó JavaScript (posible script, no un navegador)";
      } else {
        const ipCount = v.ip ? (ipCountByIp.get(v.ip) ?? 0) : 0;
        if (ipCount >= SUSPICIOUS_IP_VISIT_THRESHOLD) {
          scrapingSignal = `Esta IP generó ${ipCount} visitas nuevas en este rango`;
        }
      }
    }

    return {
      id: v.id,
      createdAt: v.createdAt,
      country: v.country,
      landingPage: v.landingPage,
      referrer: v.referrer,
      ip: v.ip,
      playsCount: v.playsCount,
      durationSeconds: Math.max(
        0,
        Math.round((v.lastSeenAt.getTime() - v.createdAt.getTime()) / 1000)
      ),
      isBot,
      visitorType: label,
      scrapingSignal,
    };
  });
}

export async function getSummary(from: Date, to: Date) {
  const [visits, pageViews, plays] = await Promise.all([
    prisma.visit.count({ where: { createdAt: { gte: from, lte: to }, isAdmin: false } }),
    prisma.pageView.count({
      where: { createdAt: { gte: from, lte: to }, visit: { isAdmin: false } },
    }),
    // VideoView has no link back to Visit, so it can't be filtered by
    // isAdmin here -- instead recordView() (lib/views.ts) simply never
    // creates one for an authenticated admin session, so this count is
    // admin-free for any play recorded after that change shipped.
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
      where: { createdAt: { gte: windowStart }, isAdmin: false },
      select: { createdAt: true },
    }),
    prisma.pageView.findMany({
      where: { createdAt: { gte: windowStart }, visit: { isAdmin: false } },
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

export type DailySearchTerms = {
  day: string;
  total: number;
  terms: { term: string; count: number }[];
};

export async function getSearchTermsByDay(from: Date, to: Date): Promise<DailySearchTerms[]> {
  const rows = await prisma.searchQuery.findMany({
    where: { createdAt: { gte: from, lte: to } },
    select: { term: true, createdAt: true },
  });

  const byDay = new Map<string, Map<string, { term: string; count: number }>>();

  for (const row of rows) {
    const day = row.createdAt.toISOString().slice(0, 10);
    const key = row.term.trim().toLowerCase();
    if (!key) continue;

    const dayTerms = byDay.get(day) ?? new Map();
    byDay.set(day, dayTerms);

    const existing = dayTerms.get(key);
    if (existing) existing.count += 1;
    else dayTerms.set(key, { term: row.term.trim(), count: 1 });
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([day, dayTerms]) => {
      const terms = Array.from(dayTerms.values()).sort((a, b) => b.count - a.count);
      return { day, terms, total: terms.reduce((sum, t) => sum + t.count, 0) };
    });
}
