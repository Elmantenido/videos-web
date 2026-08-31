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

// Fraction of the viewport width, on either side, that counts as an "edge"
// -- hovering there auto-scrolls. The middle stays still so a card can
// still be clicked reliably (a full-width hover-follow made the content
// shift out from under the cursor right as you moved in to click it).
const EDGE_ZONE = 0.15;
const AUTO_SCROLL_INTERVAL_MS = 650;
// How long the cursor must stay in an edge zone before auto-scroll starts,
// so a mouse merely passing through the zone (e.g. moving across the
// carousel to a card in the middle) doesn't trigger it.
const ZONE_DWELL_MS = 180;

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

  // Hovering the mouse near either edge auto-scrolls in that direction --
  // no click needed -- for as long as it stays there. A brief dwell delay
  // before actually starting filters out the mousemove events fired while
  // the cursor is merely passing through the edge zone on its way
  // somewhere else (e.g. sweeping across the carousel to read titles),
  // which would otherwise start and immediately stop the auto-scroll.
  const hoverZoneRef = useRef<"left" | "right" | null>(null);
  const pendingZoneRef = useRef<"left" | "right" | null>(null);
  const pendingZoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoScrollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Touch has no concept of hover, so it keeps the classic drag gesture:
  // touch, move, release -- reported as a delta from the resting position.
  const [touchDragOffset, setTouchDragOffset] = useState(0);
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const touchDraggedRef = useRef(false);

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

  // setInterval closes over whatever goNext/goPrev looked like at the
  // moment it was created, which would go stale (always reading the
  // startIndex/videos/exhausted from that instant) after the first tick.
  // Refs kept fresh every render sidestep that.
  const goNextRef = useRef(goNext);
  const goPrevRef = useRef(goPrev);
  useEffect(() => {
    goNextRef.current = goNext;
    goPrevRef.current = goPrev;
  });

  function clearPendingZone() {
    if (pendingZoneTimerRef.current !== null) {
      clearTimeout(pendingZoneTimerRef.current);
      pendingZoneTimerRef.current = null;
    }
    pendingZoneRef.current = null;
  }

  function stopAutoScroll() {
    if (autoScrollTimerRef.current !== null) {
      clearInterval(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }
    hoverZoneRef.current = null;
  }

  function startAutoScroll(zone: "left" | "right") {
    if (hoverZoneRef.current === zone) return;
    stopAutoScroll();
    hoverZoneRef.current = zone;
    const step = () => (zone === "right" ? goNextRef.current() : goPrevRef.current());
    step();
    autoScrollTimerRef.current = setInterval(step, AUTO_SCROLL_INTERVAL_MS);
  }

  useEffect(
    () => () => {
      clearPendingZone();
      stopAutoScroll();
    },
    []
  );

  function handleViewportMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;

    let zone: "left" | "right" | null = null;
    if (relativeX < EDGE_ZONE) zone = "left";
    else if (relativeX > 1 - EDGE_ZONE) zone = "right";

    // Already the actively-confirmed zone, or already idle with nothing
    // pending -- nothing to change.
    if (zone === hoverZoneRef.current && pendingZoneRef.current === null) return;

    // Already debouncing this exact zone -- let the existing timer run
    // instead of resetting the dwell clock on every mousemove.
    if (zone !== null && zone === pendingZoneRef.current) return;

    // The target zone actually changed: drop whatever was pending, and
    // stop any running auto-scroll since it no longer matches the cursor.
    clearPendingZone();
    if (hoverZoneRef.current !== null) stopAutoScroll();

    if (zone === null) return;

    pendingZoneRef.current = zone;
    pendingZoneTimerRef.current = setTimeout(() => {
      pendingZoneTimerRef.current = null;
      pendingZoneRef.current = null;
      startAutoScroll(zone);
    }, ZONE_DWELL_MS);
  }

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (loading || !stepPx) return;
    touchDraggedRef.current = false;
    setIsTouchDragging(true);
    const startX = e.touches[0].clientX;

    function onTouchMove(ev: TouchEvent) {
      const delta = ev.touches[0].clientX - startX;
      if (Math.abs(delta) > 5) touchDraggedRef.current = true;
      setTouchDragOffset(delta);
    }
    function onTouchEnd() {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);

      setIsTouchDragging(false);
      setTouchDragOffset((offset) => {
        const threshold = stepPx ? stepPx / 4 : 40;
        if (offset <= -threshold) goNext();
        else if (offset >= threshold) goPrev();
        return 0;
      });
    }
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);
  }

  function handleCardClick(e: React.MouseEvent) {
    // Only touch dragging can turn a tap into an accidental navigation --
    // edge-hover auto-scroll never touches the middle, clickable area.
    if (touchDraggedRef.current) e.preventDefault();
  }

  const canGoPrev = startIndex > 0;
  const canGoNext = !(exhausted && startIndex + visibleCount >= videos.length);

  if (videos.length === 0) return null;

  const restingOffsetPx = startIndex * stepPx;
  const displayOffsetPx = restingOffsetPx - touchDragOffset;

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

      <div
        className="carousel-viewport"
        onMouseMove={handleViewportMouseMove}
        onMouseLeave={() => {
          clearPendingZone();
          stopAutoScroll();
        }}
      >
        <div
          className="carousel-track"
          ref={trackRef}
          onTouchStart={handleTouchStart}
          style={{
            transform: `translateX(${-displayOffsetPx}px)`,
            transition: isTouchDragging ? "none" : undefined,
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
