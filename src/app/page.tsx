import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";

export const revalidate = 60; // ISR: regenera esta página cada 60s

const fallbackArtwork =
  "https://images.unsplash.com/photo-1578632292335-df3abbb0d586?auto=format&fit=crop&w=1200&q=85";

export default async function HomePage() {
  const [videos, categories, s] = await Promise.all([
    prisma.video.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 24,
      include: { categories: true },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    getSiteSettings(),
  ]);

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
            <Link href="#catalogo">{s.nav_explore}</Link>
            <Link href="#categorias">{s.nav_categories}</Link>
          </nav>
          <div className="top-actions">
            <button className="icon-button" aria-label="Search videos" title="Search videos">⌕</button>
          </div>
        </header>

        <section className="hero" style={{ backgroundImage: `url(${videos[0]?.thumbnail ?? fallbackArtwork})` }}>
          <div className="hero-shade" />
          <div className="hero-content">
            <p className="eyebrow"><span /> {s.hero_eyebrow}</p>
            <h1>{s.hero_title_line1}<br /><em>{s.hero_title_emphasis}</em> {s.hero_title_line2}</h1>
            <p className="hero-copy">{s.hero_copy}</p>
            <div className="hero-actions">
              {videos[0] ? (
                <Link href={`/video/${videos[0].slug}`} className="primary-button"><span>▶</span> {s.hero_cta_play}</Link>
              ) : <span className="primary-button">{s.hero_cta_explore}</span>}
              <Link href="#catalogo" className="ghost-button">{s.hero_cta_new} <span>↘</span></Link>
            </div>
          </div>
          <div className="hero-index">01 <span>/</span> 04</div>
        </section>

        <section id="categorias" className="category-strip">
          <div>
            <p className="section-kicker">{s.categories_kicker}</p>
            <h2>{s.categories_title_line1} <em>{s.categories_title_emphasis}</em></h2>
          </div>
          <nav className="category-links" aria-label="Categories">
            <Link className="category-pill selected" href="#catalogo">{s.category_pill_all} <span>{videos.length}</span></Link>
            {categories.map((category) => (
              <Link key={category.id} className="category-pill" href={`/categoria/${category.slug}`}>
                {category.name}
              </Link>
            ))}
          </nav>
        </section>

        <section id="catalogo" className="catalog-section">
          <div className="section-heading">
            <div><p className="section-kicker">{s.catalog_kicker}</p><h2>{s.catalog_title_line1} <em>{s.catalog_title_emphasis}</em></h2></div>
            <Link href="#catalogo" className="view-all">{s.catalog_view_all} <span>→</span></Link>
          </div>
          <div className="catalog-grid">
            {videos.map((video, index) => (
              <Link key={video.id} href={`/video/${video.slug}`} className={`video-card ${index === 0 ? "featured-card" : ""}`}>
                <div className="thumbnail-wrap">
                  {video.thumbnail ? <img src={video.thumbnail} alt={video.title} /> : <div className="no-thumbnail">{s.brand_prefix}{s.brand_suffix}</div>}
                  <span className="play-badge">▶</span>
                  {video.duration && <span className="duration">{video.duration}</span>}
                </div>
                <div className="video-meta">
                  <div><p className="video-category">{video.categories[0]?.name ?? "General"}</p><h3>{video.title}</h3></div>
                  <span className="card-arrow">↗</span>
                </div>
              </Link>
            ))}
          </div>
          {videos.length === 0 && (
            <p className="empty-state">
              {s.catalog_empty_state} <Link href="/admin">/admin</Link>.
            </p>
          )}
        </section>

        <footer className="footer">
          <span>{s.footer_copyright}</span>
          <span>{s.footer_tagline}</span>
          <Link href="/admin">{s.footer_admin_link} ↗</Link>
        </footer>
      </div>
    </main>
  );
}
