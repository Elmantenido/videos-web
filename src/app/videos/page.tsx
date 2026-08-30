import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { absoluteUrl } from "@/lib/seo";
import SiteHeader from "@/components/SiteHeader";

const PAGE_SIZE = 24;

type Props = { searchParams: Promise<{ page?: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const title = "All videos";
  const description = "Browse the full video catalog, sorted by release date.";
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl("/videos") },
    openGraph: { title, description, url: absoluteUrl("/videos") },
  };
}

function pageHref(n: number) {
  return n === 1 ? "/videos" : `/videos?page=${n}`;
}

export default async function AllVideosPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [videos, total, s] = await Promise.all([
    prisma.video.findMany({
      where: { published: true },
      // releasedAt sorts NULLs last in SQLite, so videos without a release
      // date fall to the end (ordered by upload date among themselves)
      // instead of scattering randomly through the list.
      orderBy: [{ releasedAt: "desc" }, { createdAt: "desc" }],
      include: { categories: true },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.video.count({ where: { published: true } }),
    getSiteSettings(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main>
      <SiteHeader brandPrefix={s.brand_prefix} brandSuffix={s.brand_suffix} />
      <div className="site-shell">
        <section className="catalog-section">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Full catalog</p>
              <h2>All videos</h2>
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

          {videos.length === 0 && (
            <p className="empty-state">No videos published yet.</p>
          )}

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between text-sm text-[var(--muted)]">
              <p>Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={pageHref(page - 1)}
                    className="rounded border border-white/15 px-3 py-1.5 transition-colors hover:border-white/30"
                  >
                    ← Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={pageHref(page + 1)}
                    className="rounded border border-white/15 px-3 py-1.5 transition-colors hover:border-white/30"
                  >
                    Next →
                  </Link>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
