import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const VIDEO_LISTING_PAGE_SIZE = 24;
// Recent Uploads / New Releases / Random -- the pages reached directly from
// the hamburger menu -- have their own page size, independent of the full
// catalog's, even though it's currently the same value.
export const SIDEBAR_LISTING_PAGE_SIZE = 24;

export async function getVideoListing(options: {
  where?: Prisma.VideoWhereInput;
  orderBy: Prisma.VideoOrderByWithRelationInput | Prisma.VideoOrderByWithRelationInput[];
  page: number;
  pageSize?: number;
}) {
  const where: Prisma.VideoWhereInput = { published: true, ...options.where };
  const page = Math.max(1, options.page);
  const pageSize = options.pageSize ?? VIDEO_LISTING_PAGE_SIZE;

  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      where,
      orderBy: options.orderBy,
      include: { categories: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.video.count({ where }),
  ]);

  return { videos, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

// Deterministic per-seed shuffle so pagination stays stable across pages
// (no repeats/skips) while a fresh seed (new page load) reshuffles the
// whole catalog. mulberry32 is a small, fast seeded PRNG.
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function shuffleWithSeed<T>(items: T[], seed: string): T[] {
  const result = [...items];
  const random = mulberry32(hashSeed(seed));
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function getRandomVideoListing(options: { page: number; seed: string; pageSize?: number }) {
  const page = Math.max(1, options.page);
  const pageSize = options.pageSize ?? VIDEO_LISTING_PAGE_SIZE;
  const where: Prisma.VideoWhereInput = { published: true };

  const all = await prisma.video.findMany({ where, select: { id: true }, orderBy: { id: "asc" } });
  const order = shuffleWithSeed(
    all.map((v) => v.id),
    options.seed
  );
  const total = order.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageIds = order.slice((page - 1) * pageSize, page * pageSize);

  const rows = await prisma.video.findMany({
    where: { id: { in: pageIds } },
    include: { categories: true },
  });
  const byId = new Map(rows.map((v) => [v.id, v]));
  const videos = pageIds.map((id) => byId.get(id)).filter((v): v is (typeof rows)[number] => v !== undefined);

  return { videos, total, totalPages };
}
