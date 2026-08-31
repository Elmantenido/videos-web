"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { TrendingRange } from "@/lib/views";

export type CarouselVideo = {
  id: number;
  slug: string;
  title: string;
  thumbnail: string | null;
  duration: string | null;
  views: number;
};

type Props = {
  mode: "latest" | "random" | "newReleases" | "trending";
  /** Required when mode is "trending"; ignored otherwise. */
  range?: TrendingRange;
  initialVideos: CarouselVideo[];
  brandPrefix: string;
  brandSuffix: string;
  visibleCount?: number;
};

export default function VideoCarousel({
  mode,
  range,
  initialVideos,
  brandPrefix,
  brandSuffix,
  visibleCount = 5,
}: Props) {
  const [videos, setVideos] = useState<CarouselVideo[]>(initialVideos);
  const [loading, setLoading] = useState(false);
  const [exhausted, setExhausted] = useState(initialVideos.length < visibleCount);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);

  function updateScrollButtons() {
    const track = trackRef.current;
    if (!track) return;
    setCanScrollPrev(track.scrollLeft > 4);
    setCanScrollNext(track.scrollLeft < track.scrollWidth - track.clientWidth - 4);
  }

  useEffect(() => {
    updateScrollButtons();
    window.addEventListener("resize", updateScrollButtons);

    // If the current batch doesn't even fill the track, there's nothing to
    // scroll into yet -- and with nothing to scroll, the scroll listener
    // that would normally fetch more never gets a chance to fire. Top up
    // proactively instead of waiting for a scroll event that can't happen.
    const track = trackRef.current;
    if (track && !loading && !exhausted && track.scrollWidth <= track.clientWidth) {
      fetchMore();
    }

    return () => window.removeEventListener("resize", updateScrollButtons);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos.length]);

  async function fetchMore() {
    setLoading(true);
    try {
      let more: CarouselVideo[] = [];
      if (mode === "latest") {
        const cursor = videos[videos.length - 1]?.id;
        const res = await fetch(
          `/api/videos?take=${visibleCount}${cursor ? `&cursor=${cursor}` : ""}`
        );
        const data = await res.json();
        more = data.videos ?? [];
      } else if (mode === "newReleases") {
        const res = await fetch(
          `/api/new-releases?take=${visibleCount}&skip=${videos.length}`
        );
        const data = await res.json();
        more = data.videos ?? [];
      } else if (mode === "trending") {
        const res = await fetch(
          `/api/trending?range=${range}&take=${visibleCount}&skip=${videos.length}`
        );
        const data = await res.json();
        more = (data.videos ?? []).map(
          (v: { id: number; slug: string; title: string; thumbnail: string | null; duration: string | null; viewCount: number }) => ({
            id: v.id,
            slug: v.slug,
            title: v.title,
            thumbnail: v.thumbnail,
            duration: v.duration,
            views: v.viewCount,
          })
        );
      } else {
        const excludeIds = videos.map((v) => v.id).join(",");
        const res = await fetch(
          `/api/random?take=${visibleCount}&excludeIds=${excludeIds}`
        );
        const data = await res.json();
        more = data.videos ?? [];
      }
      if (more.length < visibleCount) setExhausted(true);
      if (more.length > 0) setVideos((prev) => [...prev, ...more]);
    } finally {
      setLoading(false);
    }
  }

  function handleScroll() {
    updateScrollButtons();

    const track = trackRef.current;
    if (!track || loading || exhausted) return;

    const remaining = track.scrollWidth - track.clientWidth - track.scrollLeft;
    if (remaining < track.clientWidth * 0.5) {
      fetchMore();
    }
  }

  function scrollByStep(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const firstCard = track.firstElementChild as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(track).columnGap || "0");
    const step = firstCard ? firstCard.getBoundingClientRect().width + gap : track.clientWidth;
    track.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  if (videos.length === 0) return null;

  return (
    <div className="carousel">
      <button
        type="button"
        className="carousel-arrow carousel-arrow-left"
        onClick={() => scrollByStep(-1)}
        disabled={!canScrollPrev}
        aria-label="Previous videos"
      >
        ‹
      </button>

      <div className="carousel-viewport">
        <div className="carousel-track" ref={trackRef} onScroll={handleScroll}>
          {videos.map((video, i) => (
            <Link key={video.id} href={`/video/${video.slug}`} className="video-card carousel-item">
              <div className="thumbnail-wrap">
                {video.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    width={300}
                    height={450}
                    loading={i === 0 ? "eager" : "lazy"}
                  />
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
      </div>

      <button
        type="button"
        className="carousel-arrow carousel-arrow-right"
        onClick={() => scrollByStep(1)}
        disabled={!canScrollNext || loading}
        aria-label="Next videos"
      >
        ›
      </button>
    </div>
  );
}
