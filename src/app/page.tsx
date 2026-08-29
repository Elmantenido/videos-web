import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { getTrending } from "@/lib/views";
import TrendingSection from "@/components/TrendingSection";
import VideoCarousel from "@/components/VideoCarousel";
import SearchBox from "@/components/SearchBox";

export const revalidate = 60; // ISR: regenera esta página cada 60s

const fallbackArtwork =
  "https://images.unsplash.com/photo-1578632292335-df3abbb0d586?auto=format&fit=crop&w=1200&q=85";

const CAROUSEL_PAGE_SIZE = 5;

export default async function HomePage() {
  const [latestVideos, randomVideos, totalVideos, categories, s, trending] = await Promise.all([
    prisma.video.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: CAROUSEL_PAGE_SIZE,
    }),
    prisma.video
      .findMany({ where: { published: true } })
      .then((all) => all.sort(() => Math.random() - 0.5).slice(0, CAROUSEL_PAGE_SIZE)),
    prisma.video.count({ where: { published: true } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    getSiteSettings(),
    getTrending("today", 10),
  ]);

  const heroEnabled = s.hero_enabled !== "false";
  const heroVideo = latestVideos[0];

  const randomSection = (
    <section id="random" className="catalog-section">
      <div className="section-heading">
        <div>
          <p className="section-kicker">{s.random_kicker}</p>
          <h2>{s.random_title}</h2>
        </div>
      </div>
      <VideoCarousel
        mode="random"
        initialVideos={randomVideos}
        brandPrefix={s.brand_prefix}
        brandSuffix={s.brand_suffix}
        visibleCount={CAROUSEL_PAGE_SIZE}
      />
    </section>
  );

  const catalogSection = (
    <section id="catalogo" className="catalog-section">
      <div className="section-heading">
        <div><p className="section-kicker">{s.catalog_kicker}</p><h2>{s.catalog_title_line1} <em>{s.catalog_title_emphasis}</em></h2></div>
        <Link href="#catalogo" className="view-all">{s.catalog_view_all} <span>→</span></Link>
      </div>
      <VideoCarousel
        mode="latest"
        initialVideos={latestVideos}
        brandPrefix={s.brand_prefix}
        brandSuffix={s.brand_suffix}
        visibleCount={CAROUSEL_PAGE_SIZE}
      />
      {totalVideos === 0 && (
        <p className="empty-state">
          {s.catalog_empty_state} <Link href="/admin">/admin</Link>.
        </p>
      )}
    </section>
  );

  return (
    <main>
      <div className="site-shell">
        <header className="topbar">
          <Link href="/" className="brand" aria-label={`${s.brand_prefix}${s.brand_suffix} home`}>
            <span className="brand-mark">{s.brand_prefix.charAt(0)}</span>
            <span>{s.brand_prefix}<span>{s.brand_suffix}</span></span>
          </Link>
          <nav className="main-nav" aria-label="Main navigation">
            <Link className="active" href="/">{s.nav_home}</Link>
            <Link href="#categorias">{s.nav_explore}</Link>
            <Link href="#categorias">{s.nav_categories}</Link>
            <Link href="#trending">Trending</Link>
          </nav>
          <div className="top-actions">
            <SearchBox />
          </div>
        </header>

        {!heroEnabled && (
          <>
            {catalogSection}
            {randomSection}
          </>
        )}

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

        <section id="categorias" className="category-strip">
          <div>
            <p className="section-kicker">{s.categories_kicker}</p>
            <h2>{s.categories_title_line1} <em>{s.categories_title_emphasis}</em></h2>
          </div>
          <nav className="category-links" aria-label="Categories">
            <Link className="category-pill selected" href="#catalogo">{s.category_pill_all} <span>{totalVideos}</span></Link>
            {categories.map((category) => (
              <Link key={category.id} className="category-pill" href={`/categoria/${category.slug}`}>
                {category.name}
              </Link>
            ))}
          </nav>
        </section>

        <TrendingSection
          initialRange="today"
          initialVideos={trending}
          kicker={s.trending_kicker}
          title={s.trending_title}
        />

        {heroEnabled && (
          <>
            {catalogSection}
            {randomSection}
          </>
        )}

        <footer className="footer">
          <span>{s.footer_copyright}</span>
          <span>{s.footer_tagline}</span>
          <Link href="/admin">{s.footer_admin_link} ↗</Link>
        </footer>
      </div>
    </main>
  );
}
