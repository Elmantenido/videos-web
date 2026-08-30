import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const VIDEO_LISTING_PAGE_SIZE = 24;

export async function getVideoListing(options: {
  where?: Prisma.VideoWhereInput;
  orderBy: Prisma.VideoOrderByWithRelationInput | Prisma.VideoOrderByWithRelationInput[];
  page: number;
}) {
  const where: Prisma.VideoWhereInput = { published: true, ...options.where };
  const page = Math.max(1, options.page);

  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      where,
      orderBy: options.orderBy,
      include: { categories: true },
      skip: (page - 1) * VIDEO_LISTING_PAGE_SIZE,
      take: VIDEO_LISTING_PAGE_SIZE,
    }),
    prisma.video.count({ where }),
  ]);

  return { videos, total, totalPages: Math.max(1, Math.ceil(total / VIDEO_LISTING_PAGE_SIZE)) };
}
