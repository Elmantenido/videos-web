import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Admin-to-admin data transfer between two of the OWNER's own deployments
 * of this same app (see /admin/extraction). Requires a shared secret --
 * this is deliberately not a generic scraper: it only returns data for a
 * given slug on THIS installation, and only to a caller that already
 * knows EXPORT_API_KEY (which the owner sets identically on both sites).
 */
export async function GET(req: NextRequest) {
  const key = req.headers.get("x-export-key");
  if (!key || !process.env.EXPORT_API_KEY || key !== process.env.EXPORT_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const video = await prisma.video.findUnique({
    where: { slug },
    include: { categories: true, tags: true },
  });
  if (!video) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    title: video.title,
    description: video.description,
    embedUrl: video.embedUrl,
    thumbnail: video.thumbnail,
    backgroundImage: video.backgroundImage,
    duration: video.duration,
    studio: video.studio,
    previewHtml: video.previewHtml,
    categoryNames: video.categories.map((c) => c.name),
    tagNames: video.tags.map((t) => t.name),
  });
}
