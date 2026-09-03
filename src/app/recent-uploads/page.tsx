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
  const title = page > 1 ? `Recent Uploads — Page ${page}` : "Recent Uploads";
  const description = "Every video, sorted by the date it was uploaded.";
  return {
    title,
    description,
    alternates: { canonical: paginatedCanonical("/recent-uploads", page) },
    openGraph: { title, description, url: paginatedCanonical("/recent-uploads", page) },
  };
}

export default async function RecentUploadsPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [{ videos, totalPages }, s] = await Promise.all([
    getVideoListing({ orderBy: { createdAt: "desc" }, page, pageSize: SIDEBAR_LISTING_PAGE_SIZE }),
    getSiteSettings(),
  ]);

  return (
    <main>
      <SiteHeader brandPrefix={s.brand_prefix} brandSuffix={s.brand_suffix} />
      <div className="site-shell">
        <VideoGridSection
          kicker="Updated today"
          title="Recent Uploads"
          videos={videos}
          emptyStateText="No videos uploaded yet."
          page={page}
          totalPages={totalPages}
          basePath="/recent-uploads"
          brandPrefix={s.brand_prefix}
          brandSuffix={s.brand_suffix}
        />
      </div>

      <SiteFooter copyright={s.footer_copyright} tagline={s.footer_tagline} adminLabel={s.footer_admin_link} keywordPhrase={s.footer_keyword_phrase} partnersHtml={s.footer_partners_html} />
    </main>
  );
}
