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
  const [startIndex, setStartIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exhausted, setExhausted] = useState(initialVideos.length < visibleCount);
  const [stepPx, setStepPx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  // Drag-to-scroll: lets a mouse (or touch) drag move the carousel like the
  // arrow buttons do, instead of requiring the arrows. Uses classic
  // mousedown/touchstart + window-level move/up listeners rather than the
  // Pointer Events + setPointerCapture API -- that version worked in
  // automated testing but not for real mouse drags in at least one real
  // browser, most likely because it never called preventDefault() on the
  // initial mousedown, leaving the browser free to start its own native
  // drag/text-selection gesture that wins over ours.
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef(0);
  const draggedRef = useRef(false);

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

  function moveDrag(clientX: number, startX: number) {
    const delta = clientX - startX;
    if (Math.abs(delta) > 5) draggedRef.current = true;
    dragOffsetRef.current = delta;
    setDragOffset(delta);
  }

  function finishDrag() {
    setIsDragging(false);
    const offset = dragOffsetRef.current;
    const threshold = stepPx ? stepPx / 4 : 40;
    if (offset <= -threshold) goNext();
    else if (offset >= threshold) goPrev();
    dragOffsetRef.current = 0;
    setDragOffset(0);
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (loading || !stepPx) return;
    // Stop the browser from starting its own native drag/text-selection
    // gesture on the link/image under the cursor, which would otherwise
    // swallow the subsequent mousemove events before they reach us.
    e.preventDefault();

    draggedRef.current = false;
    dragOffsetRef.current = 0;
    setIsDragging(true);
    const startX = e.clientX;

    function onMouseMove(ev: MouseEvent) {
      moveDrag(ev.clientX, startX);
    }
    function onMouseUp() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      finishDrag();
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (loading || !stepPx) return;
    draggedRef.current = false;
    dragOffsetRef.current = 0;
    setIsDragging(true);
    const startX = e.touches[0].clientX;

    function onTouchMove(ev: TouchEvent) {
      moveDrag(ev.touches[0].clientX, startX);
    }
    function onTouchEnd() {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      finishDrag();
    }
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);
  }

  function handleCardClick(e: React.MouseEvent) {
    if (draggedRef.current) e.preventDefault();
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
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          style={{
            transform: `translateX(${-(startIndex * stepPx) + dragOffset}px)`,
            transition: isDragging ? "none" : undefined,
            cursor: isDragging ? "grabbing" : "grab",
            touchAction: "pan-y",
          }}
        >
          {videos.map((video, i) => (
            <Link
              key={video.id}
              href={`/video/${video.slug}`}
              className="video-card carousel-item"
              onClick={handleCardClick}
              draggable={false}
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
                    draggable={false}
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
