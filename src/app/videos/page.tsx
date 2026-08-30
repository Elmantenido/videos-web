import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/site-settings";
import { getVideoListing } from "@/lib/video-listing";
import { paginatedCanonical } from "@/lib/seo";
import SiteHeader from "@/components/SiteHeader";
import VideoGridSection from "@/components/VideoGridSection";

type Props = { searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const title = page > 1 ? `All videos — Page ${page}` : "All videos";
  const description = "Browse the full video catalog, sorted by release date.";
  return {
    title,
    description,
    alternates: { canonical: paginatedCanonical("/videos", page) },
    openGraph: { title, description, url: paginatedCanonical("/videos", page) },
  };
}

export default async function AllVideosPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [{ videos, totalPages }, s] = await Promise.all([
    // releasedAt sorts NULLs last in SQLite, so videos without a release
    // date fall to the end (ordered by upload date among themselves)
    // instead of scattering randomly through the list.
    getVideoListing({ orderBy: [{ releasedAt: "desc" }, { createdAt: "desc" }], page }),
    getSiteSettings(),
  ]);

  return (
    <main>
      <SiteHeader brandPrefix={s.brand_prefix} brandSuffix={s.brand_suffix} />
      <div className="site-shell">
        <VideoGridSection
          kicker="Full catalog"
          title="All videos"
          videos={videos}
          emptyStateText="No videos published yet."
          page={page}
          totalPages={totalPages}
          basePath="/videos"
          brandPrefix={s.brand_prefix}
          brandSuffix={s.brand_suffix}
        />
      </div>
    </main>
  );
}
