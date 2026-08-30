"use client";

import { useEffect, useRef, useState } from "react";
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
  mode: "latest" | "random" | "newReleases";
  initialVideos: CarouselVideo[];
  brandPrefix: string;
  brandSuffix: string;
  visibleCount?: number;
};

export default function VideoCarousel({
  mode,
  initialVideos,
  brandPrefix,
  brandSuffix,
  visibleCount = 5,
}: Props) {
  const [videos, setVideos] = useState<CarouselVideo[]>(initialVideos);
  const [startIndex, setStartIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exhausted, setExhausted] = useState(initialVideos.length < visibleCount);
  const [stepPx, setStepPx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function measure() {
      const track = trackRef.current;
      const firstCard = track?.firstElementChild as HTMLElement | undefined;
      if (!track || !firstCard) return;
      const gap = parseFloat(getComputedStyle(track).columnGap || "0");
      setStepPx(firstCard.getBoundingClientRect().width + gap);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
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

  async function goNext() {
    if (loading) return;
    const nextStart = startIndex + 1;
    if (nextStart + visibleCount > videos.length && exhausted) return;

    setStartIndex(nextStart);
    if (nextStart + visibleCount >= videos.length && !exhausted) {
      await fetchMore();
    }
  }

  function goPrev() {
    setStartIndex((i) => Math.max(0, i - 1));
  }

  const canGoPrev = startIndex > 0;
  const canGoNext = !(exhausted && startIndex + visibleCount >= videos.length);

  if (videos.length === 0) return null;

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

      <div className="carousel-viewport">
        <div
          className="carousel-track"
          ref={trackRef}
          style={{ transform: `translateX(-${startIndex * stepPx}px)` }}
        >
          {videos.map((video, i) => (
            <Link
              key={video.id}
              href={`/video/${video.slug}`}
              className="video-card carousel-item"
            >
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
        onClick={goNext}
        disabled={!canGoNext || loading}
        aria-label="Next videos"
      >
        ›
      </button>
    </div>
  );
}
