import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/site-settings";
import { getVideoListing, SIDEBAR_LISTING_PAGE_SIZE } from "@/lib/video-listing";
import { paginatedCanonical } from "@/lib/seo";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import VideoGridSection from "@/components/VideoGridSection";

type Props = { searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const title = page > 1 ? `New Releases — Page ${page}` : "New Releases";
  const description = "Every video with a known release date, newest first.";
  return {
    title,
    description,
    alternates: { canonical: paginatedCanonical("/new-releases", page) },
    openGraph: { title, description, url: paginatedCanonical("/new-releases", page) },
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
      pageSize: SIDEBAR_LISTING_PAGE_SIZE,
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

      <SiteFooter copyright={s.footer_copyright} tagline={s.footer_tagline} adminLabel={s.footer_admin_link} keywordPhrase={s.footer_keyword_phrase} />
    </main>
  );
}
