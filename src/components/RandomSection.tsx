"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RandomVideo = {
  id: number;
  slug: string;
  title: string;
  thumbnail: string | null;
  duration: string | null;
  studio: string | null;
  categories: { name: string }[];
};

type Props = {
  kicker: string;
  title: string;
  brandPrefix: string;
  brandSuffix: string;
  take?: number;
};

export default function RandomSection({ kicker, title, brandPrefix, brandSuffix, take = 24 }: Props) {
  const [videos, setVideos] = useState<RandomVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/random?take=${take}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setVideos(data.videos ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [take]);

  if (!loading && videos.length === 0) return null;

  return (
    <section id="random" className="catalog-section">
      <div className="section-heading">
        <div>
          <p className="section-kicker">{kicker}</p>
          <h2>{title}</h2>
        </div>
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
    </section>
  );
}
