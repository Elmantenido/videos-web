import type { Metadata } from "next";
import Link from "next/link";
import { getHomeData } from "@/lib/home-data";
import { absoluteUrl } from "@/lib/seo";
import TrendingSection from "@/components/TrendingSection";
import CatalogSection from "@/components/CatalogSection";
import NewReleasesSection from "@/components/NewReleasesSection";
import RandomVideosSection from "@/components/RandomVideosSection";
import CategoriesSection from "@/components/CategoriesSection";
import HomeHeader from "@/components/HomeHeader";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const title = "Explore the catalog";
  const description = "Browse the latest videos, random picks, categories, and trending content.";
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl("/explore") },
    openGraph: { title, description, url: absoluteUrl("/explore") },
  };
}

export default async function ExplorePage() {
  const { latestVideos, newReleases, randomVideos, totalVideos, categories, settings: s, trending } =
    await getHomeData();

  return (
    <main>
      <div className="site-shell">
        <HomeHeader
          brandPrefix={s.brand_prefix}
          brandSuffix={s.brand_suffix}
          navHome={s.nav_home}
          navExplore={s.nav_explore}
          navCategories={s.nav_categories}
          activeTab="explore"
        />

        <h1 className="sr-only">Explore the catalog</h1>

        <CategoriesSection
          categories={categories}
          totalVideos={totalVideos}
          kicker={s.categories_kicker}
          titleLine1={s.categories_title_line1}
          titleEmphasis={s.categories_title_emphasis}
          pillAllLabel={s.category_pill_all}
          centered
        />

        <CatalogSection
          videos={latestVideos}
          totalVideos={totalVideos}
          kicker={s.catalog_kicker}
          titleLine1={s.catalog_title_line1}
          titleEmphasis={s.catalog_title_emphasis}
          viewAllLabel={s.catalog_view_all}
          emptyStateText={s.catalog_empty_state}
          brandPrefix={s.brand_prefix}
          brandSuffix={s.brand_suffix}
        />

        <NewReleasesSection
          videos={newReleases}
          kicker={s.new_releases_kicker}
          title={s.new_releases_title}
          brandPrefix={s.brand_prefix}
          brandSuffix={s.brand_suffix}
        />

        <RandomVideosSection
          videos={randomVideos}
          kicker={s.random_kicker}
          title={s.random_title}
          brandPrefix={s.brand_prefix}
          brandSuffix={s.brand_suffix}
        />

        <TrendingSection
          initialRange="month"
          initialVideos={trending}
          kicker={s.trending_kicker}
          title={s.trending_title}
          brandPrefix={s.brand_prefix}
          brandSuffix={s.brand_suffix}
        />

        <footer className="footer">
          <span>{s.footer_copyright}</span>
          <span>{s.footer_tagline}</span>
          <Link href="/admin">{s.footer_admin_link} ↗</Link>
        </footer>
      </div>
    </main>
  );
}
