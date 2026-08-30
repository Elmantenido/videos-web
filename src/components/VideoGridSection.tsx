import Link from "next/link";

type Category = { id: number; name: string; slug: string };
type Video = {
  id: number;
  slug: string;
  title: string;
  thumbnail: string | null;
  duration: string | null;
  studio: string | null;
  categories: Category[];
};

type Props = {
  kicker: string;
  title: string;
  videos: Video[];
  emptyStateText: string;
  page: number;
  totalPages: number;
  basePath: string;
  brandPrefix: string;
  brandSuffix: string;
};

function pageHref(basePath: string, page: number) {
  return page === 1 ? basePath : `${basePath}?page=${page}`;
}

export default function VideoGridSection({
  kicker,
  title,
  videos,
  emptyStateText,
  page,
  totalPages,
  basePath,
  brandPrefix,
  brandSuffix,
}: Props) {
  return (
    <section className="catalog-section">
      <div className="section-heading">
        <div>
          <p className="section-kicker">{kicker}</p>
          <h2>{title}</h2>
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
                <div className="no-thumbnail">{brandPrefix}{brandSuffix}</div>
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

      {videos.length === 0 && <p className="empty-state">{emptyStateText}</p>}

      {totalPages > 1 && (
        <div className="pagination">
          {page > 1 && (
            <Link href={pageHref(basePath, page - 1)} className="pagination-arrow">← Previous</Link>
          )}
          <span className="pagination-status">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link href={pageHref(basePath, page + 1)} className="pagination-arrow">Next →</Link>
          )}
        </div>
      )}
    </section>
  );
}
