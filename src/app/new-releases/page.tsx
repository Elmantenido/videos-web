import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/site-settings";
import { getVideoListing } from "@/lib/video-listing";
import { absoluteUrl } from "@/lib/seo";
import SiteHeader from "@/components/SiteHeader";
import VideoGridSection from "@/components/VideoGridSection";

type Props = { searchParams: Promise<{ page?: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const title = "New Releases";
  const description = "Every video with a known release date, newest first.";
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl("/new-releases") },
    openGraph: { title, description, url: absoluteUrl("/new-releases") },
  };
}

export default async function NewReleasesPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [{ videos, totalPages }, s] = await Promise.all([
    getVideoListing({
      where: { releasedAt: { not: null } },
      orderBy: { releasedAt: "desc" },
      page,
    }),
    getSiteSettings(),
  ]);

  return (
    <main>
      <SiteHeader brandPrefix={s.brand_prefix} brandSuffix={s.brand_suffix} />
      <div className="site-shell">
        <VideoGridSection
          kicker="Fresh drops"
          title="New Releases"
          videos={videos}
          emptyStateText="No videos with a release date yet."
          page={page}
          totalPages={totalPages}
          basePath="/new-releases"
          brandPrefix={s.brand_prefix}
          brandSuffix={s.brand_suffix}
        />
      </div>
    </main>
  );
}
