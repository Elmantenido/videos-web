import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import SiteHeader from "@/components/SiteHeader";

type Props = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Search: ${q}` : "Search",
    // Internal search-result pages are query-driven, thin/duplicate content
    // that Google explicitly recommends keeping out of the index — still
    // crawlable so link discovery on the page keeps working.
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  if (query) {
    prisma.searchQuery.create({ data: { term: query.slice(0, 200) } }).catch(() => {});
  }

  const [videos, s] = await Promise.all([
    query
      ? prisma.video.findMany({
          where: {
            published: true,
            OR: [
              { title: { contains: query } },
              { studio: { contains: query } },
              { description: { contains: query } },
            ],
          },
          orderBy: { createdAt: "desc" },
          include: { categories: true },
          take: 60,
        })
      : Promise.resolve([]),
    getSiteSettings(),
  ]);

  return (
    <main>
      <SiteHeader brandPrefix={s.brand_prefix} brandSuffix={s.brand_suffix} />
      <div className="site-shell">
        <section className="catalog-section">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Search results</p>
              <h2>{query ? `"${query}"` : "Search"}</h2>
            </div>
            <Link href="/" className="view-all">Back to home <span>→</span></Link>
          </div>

          <div className="catalog-grid">
            {videos.map((video) => (
              <Link key={video.id} href={`/video/${video.slug}`} className="video-card">
                <div className="thumbnail-wrap">
                  {video.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={video.thumbnail} alt={video.title} />
                  ) : (
                    <div className="no-thumbnail">{s.brand_prefix}{s.brand_suffix}</div>
                  )}
                  <span className="play-badge">▶</span>
                  {video.duration && <span className="duration">{video.duration}</span>}
                </div>
                <div className="video-meta">
                  <div>
                    <p className="video-category">{video.categories[0]?.name ?? "General"}</p>
                    <h3>{video.title}</h3>
                    {video.studio && <p className="video-studio">{video.studio}</p>}
                  </div>
                  <span className="card-arrow">↗</span>
                </div>
              </Link>
            ))}
          </div>

          {query && videos.length === 0 && (
            <p className="empty-state">No results for &quot;{query}&quot;.</p>
          )}
          {!query && (
            <p className="empty-state">Type something in the search box to find videos.</p>
          )}
        </section>
      </div>
    </main>
  );
}
