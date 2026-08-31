import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/site-settings";
import { getRandomVideoListing } from "@/lib/video-listing";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import VideoGridSection from "@/components/VideoGridSection";

type Props = { searchParams: Promise<{ page?: string; seed?: string }> };

function createRandomSeed(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Random",
    description: "The full video catalog in random order.",
    // Every seed produces a different ordering of the same videos, so a
    // /random?seed=... URL is a duplicate/thin variation, not something
    // worth indexing (same reasoning as internal search results).
    robots: { index: false, follow: true },
  };
}

export default async function RandomPage({ searchParams }: Props) {
  const { page: pageParam, seed: seedParam } = await searchParams;

  if (!seedParam) {
    redirect(`/random?seed=${createRandomSeed()}`);
  }

  const page = Math.max(1, Number(pageParam) || 1);

  const [{ videos, totalPages }, s] = await Promise.all([
    getRandomVideoListing({ page, seed: seedParam }),
    getSiteSettings(),
  ]);

  return (
    <main>
      <SiteHeader brandPrefix={s.brand_prefix} brandSuffix={s.brand_suffix} />
      <div className="site-shell">
        <VideoGridSection
          kicker="Feeling lucky"
          title="Random"
          videos={videos}
          emptyStateText="No videos yet."
          page={page}
          totalPages={totalPages}
          basePath="/random"
          extraQuery={`seed=${seedParam}`}
          brandPrefix={s.brand_prefix}
          brandSuffix={s.brand_suffix}
        />
      </div>

      <SiteFooter copyright={s.footer_copyright} tagline={s.footer_tagline} adminLabel={s.footer_admin_link} keywordPhrase={s.footer_keyword_phrase} />
    </main>
  );
}
