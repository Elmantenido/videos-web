"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type CarouselVideo = {
  id: number;
  slug: string;
  title: string;
  thumbnail: string | null;
  duration: string | null;
  views: number;
};

type Props = {
  mode: "latest" | "random";
  initialVideos: CarouselVideo[];
  brandPrefix: string;
  brandSuffix: string;
  pageSize?: number;
};

export default function VideoCarousel({
  mode,
  initialVideos,
  brandPrefix,
  brandSuffix,
  pageSize = 5,
}: Props) {
  const [pages, setPages] = useState<CarouselVideo[][]>([initialVideos]);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exhausted, setExhausted] = useState(initialVideos.length < pageSize);

  const seenIds = useMemo(() => pages.flat().map((v) => v.id), [pages]);

  async function goNext() {
    if (pageIndex < pages.length - 1) {
      setPageIndex((i) => i + 1);
      return;
    }
    if (exhausted || loading) return;

    setLoading(true);
    try {
      let nextVideos: CarouselVideo[] = [];
      if (mode === "latest") {
        const lastPage = pages[pages.length - 1];
        const cursor = lastPage[lastPage.length - 1]?.id;
        const res = await fetch(
          `/api/videos?take=${pageSize}${cursor ? `&cursor=${cursor}` : ""}`
        );
        const data = await res.json();
        nextVideos = data.videos ?? [];
      } else {
        const res = await fetch(
          `/api/random?take=${pageSize}&excludeIds=${seenIds.join(",")}`
        );
        const data = await res.json();
        nextVideos = data.videos ?? [];
      }

      if (nextVideos.length === 0) {
        setExhausted(true);
      } else {
        setPages((prev) => [...prev, nextVideos]);
        setPageIndex((i) => i + 1);
        if (nextVideos.length < pageSize) setExhausted(true);
      }
    } finally {
      setLoading(false);
    }
  }

  function goPrev() {
    setPageIndex((i) => Math.max(0, i - 1));
  }

  const current = pages[pageIndex] ?? [];
  const canGoPrev = pageIndex > 0;
  const canGoNext = pageIndex < pages.length - 1 || !exhausted;

  if (current.length === 0) return null;

  return (
    <div className="carousel">
      <button
        type="button"
        className="carousel-arrow carousel-arrow-left"
        onClick={goPrev}
        disabled={!canGoPrev}
        aria-label="Previous videos"
      >
        ‹
      </button>

      <div className="catalog-grid">
        {current.map((video) => (
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
                <h3>{video.title}</h3>
                <p className="video-views">{video.views.toLocaleString()} views</p>
              </div>
              <span className="card-arrow">↗</span>
            </div>
          </Link>
        ))}
      </div>

      <button
        type="button"
        className="carousel-arrow carousel-arrow-right"
        onClick={goNext}
        disabled={!canGoNext || loading}
        aria-label="Next videos"
      >
        ›
      </button>
    </div>
  );
}
