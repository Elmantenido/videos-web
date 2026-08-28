import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const revalidate = 60; // ISR: regenera esta página cada 60s

const fallbackArtwork =
  "https://images.unsplash.com/photo-1578632292335-df3abbb0d586?auto=format&fit=crop&w=1200&q=85";

export default async function HomePage() {
  const [videos, categories] = await Promise.all([
    prisma.video.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 24,
      include: { categories: true },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <main>
      <div className="site-shell">
        <header className="topbar">
          <Link href="/" className="brand" aria-label="NOVAFLIX inicio">
            <span className="brand-mark">N</span>
            <span>NOVA<span>FLIX</span></span>
          </Link>
          <nav className="main-nav" aria-label="Navegación principal">
            <Link className="active" href="/">Inicio</Link>
            <Link href="#catalogo">Explorar</Link>
            <Link href="#categorias">Categorías</Link>
          </nav>
          <div className="top-actions">
            <button className="icon-button" aria-label="Buscar videos" title="Buscar videos">⌕</button>
            <Link href="/admin" className="admin-link">Añadir video <span>+</span></Link>
          </div>
        </header>

        <section className="hero" style={{ backgroundImage: `url(${videos[0]?.thumbnail ?? fallbackArtwork})` }}>
          <div className="hero-shade" />
          <div className="hero-content">
            <p className="eyebrow"><span /> Selección de la semana</p>
            <h1>Historias que<br /><em>merecen</em> verse.</h1>
            <p className="hero-copy">Una colección curada de piezas, episodios y momentos para descubrir algo nuevo.</p>
            <div className="hero-actions">
              {videos[0] ? (
                <Link href={`/video/${videos[0].slug}`} className="primary-button"><span>▶</span> Ver ahora</Link>
              ) : <span className="primary-button">Explorar catálogo</span>}
              <Link href="#catalogo" className="ghost-button">Ver novedades <span>↘</span></Link>
            </div>
          </div>
          <div className="hero-index">01 <span>/</span> 04</div>
        </section>

        <section id="categorias" className="category-strip">
          <div>
            <p className="section-kicker">Explora por tema</p>
            <h2>Encuentra tu próximo <em>favorito.</em></h2>
          </div>
          <nav className="category-links" aria-label="Categorías">
            <Link className="category-pill selected" href="#catalogo">Todo <span>{videos.length}</span></Link>
            {categories.map((category) => (
              <Link key={category.id} className="category-pill" href={`/categoria/${category.slug}`}>
                {category.name}
              </Link>
            ))}
          </nav>
        </section>

        <section id="catalogo" className="catalog-section">
          <div className="section-heading">
            <div><p className="section-kicker">Actualizado hoy</p><h2>Últimos <em>videos</em></h2></div>
            <Link href="#catalogo" className="view-all">Ver todo <span>→</span></Link>
          </div>
          <div className="catalog-grid">
            {videos.map((video, index) => (
              <Link key={video.id} href={`/video/${video.slug}`} className={`video-card ${index === 0 ? "featured-card" : ""}`}>
                <div className="thumbnail-wrap">
                  {video.thumbnail ? <img src={video.thumbnail} alt={video.title} /> : <div className="no-thumbnail">NOVAFLIX</div>}
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
          {videos.length === 0 && <p className="empty-state">Aún no hay videos publicados. Agrégalos desde <Link href="/admin">/admin</Link>.</p>}
        </section>

        <footer className="footer"><span>© 2026 NOVAFLIX</span><span>Una mirada diferente al entretenimiento</span><Link href="/admin">Panel de administración ↗</Link></footer>
      </div>
    </main>
  );
}
