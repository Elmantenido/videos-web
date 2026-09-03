import Link from "next/link";
import type { Metadata } from "next";
import { getHomeData } from "@/lib/home-data";
import { absoluteUrl } from "@/lib/seo";
import TrendingSection from "@/components/TrendingSection";
import CatalogSection from "@/components/CatalogSection";
import NewReleasesSection from "@/components/NewReleasesSection";
import RandomVideosSection from "@/components/RandomVideosSection";
import CategoriesSection from "@/components/CategoriesSection";
import HomeHeader from "@/components/HomeHeader";
import SiteFooter from "@/components/SiteFooter";

export const revalidate = 60; // ISR: regenera esta página cada 60s

export async function generateMetadata(): Promise<Metadata> {
  return { alternates: { canonical: absoluteUrl("/") } };
}

const fallbackArtwork =
  "https://images.unsplash.com/photo-1578632292335-df3abbb0d586?auto=format&fit=crop&w=1200&q=85";

export default async function HomePage() {
  const { latestVideos, newReleases, randomVideos, totalVideos, categories, settings: s, trending } =
    await getHomeData();

  const heroEnabled = s.hero_enabled !== "false";
  const heroVideo = latestVideos[0];

  const contentSections = (
    <>
      <NewReleasesSection
        videos={newReleases}
        kicker={s.new_releases_kicker}
        title={s.new_releases_title}
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

      <RandomVideosSection
        videos={randomVideos}
        kicker={s.random_kicker}
        title={s.random_title}
        brandPrefix={s.brand_prefix}
        brandSuffix={s.brand_suffix}
      />

      <CategoriesSection
        categories={categories}
        totalVideos={totalVideos}
        kicker={s.categories_kicker}
        titleLine1={s.categories_title_line1}
        titleEmphasis={s.categories_title_emphasis}
        pillAllLabel={s.category_pill_all}
        centered
      />
    </>
  );

  return (
    <main>
      <HomeHeader
        brandPrefix={s.brand_prefix}
        brandSuffix={s.brand_suffix}
        navHome={s.nav_home}
        navExplore={s.nav_explore}
        navCategories={s.nav_categories}
        activeTab="home"
      />

      <div className="site-shell">
        {!heroEnabled && contentSections}

        {heroEnabled && (
          <section className="hero" style={{ backgroundImage: `url(${heroVideo?.thumbnail ?? fallbackArtwork})` }}>
            <div className="hero-shade" />
            <div className="hero-content">
              <p className="eyebrow"><span /> {s.hero_eyebrow}</p>
              <h1>{s.hero_title_line1}<br /><em>{s.hero_title_emphasis}</em> {s.hero_title_line2}</h1>
              <p className="hero-copy">{s.hero_copy}</p>
              <div className="hero-actions">
                {heroVideo ? (
                  <Link href={`/video/${heroVideo.slug}`} className="primary-button"><span>▶</span> {s.hero_cta_play}</Link>
                ) : <span className="primary-button">{s.hero_cta_explore}</span>}
                <Link href="#catalogo" className="ghost-button">{s.hero_cta_new} <span>↘</span></Link>
              </div>
            </div>
            <div className="hero-index">01 <span>/</span> 04</div>
          </section>
        )}

        {heroEnabled && contentSections}

        <SiteFooter copyright={s.footer_copyright} tagline={s.footer_tagline} adminLabel={s.footer_admin_link} keywordPhrase={s.footer_keyword_phrase} partnersHtml={s.footer_partners_html} />
      </div>
    </main>
  );
}
