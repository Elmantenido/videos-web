"use client";

import { useState } from "react";
import VideoCarousel, { type CarouselVideo } from "@/components/VideoCarousel";
import { CAROUSEL_PAGE_SIZE } from "@/lib/carousel";
import type { TrendingRange, TrendingVideo } from "@/lib/views";

const RANGE_LABELS: { value: TrendingRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

type Props = {
  initialRange: TrendingRange;
  initialVideos: TrendingVideo[];
  title: string;
  kicker: string;
  brandPrefix: string;
  brandSuffix: string;
};

function toCarouselVideo(v: TrendingVideo): CarouselVideo {
  return {
    id: v.id,
    slug: v.slug,
    title: v.title,
    thumbnail: v.thumbnail,
    duration: v.duration,
    views: v.viewCount,
  };
}

export default function TrendingSection({
  initialRange,
  initialVideos,
  title,
  kicker,
  brandPrefix,
  brandSuffix,
}: Props) {
  const [range, setRange] = useState<TrendingRange>(initialRange);
  const [cache, setCache] = useState<Partial<Record<TrendingRange, TrendingVideo[]>>>({
    [initialRange]: initialVideos,
  });

  function selectRange(next: TrendingRange) {
    setRange(next);
    if (cache[next]) return;

    fetch(`/api/trending?range=${next}`)
      .then((res) => res.json())
      .then((data) => {
        setCache((prev) => ({ ...prev, [next]: data.videos ?? [] }));
      });
  }

  const videos = cache[range];

  return (
    <section id="trending" className="catalog-section">
      <div className="section-heading">
        <div>
          <p className="section-kicker">{kicker}</p>
          <h2>{title}</h2>
        </div>
        <div className="trending-tabs">
          {RANGE_LABELS.map((r) => (
            <button
              key={r.value}
              className={`trending-tab ${range === r.value ? "selected" : ""}`}
              onClick={() => selectRange(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {videos === undefined ? (
        <p className="empty-state">Loading…</p>
      ) : videos.length === 0 ? (
        <p className="empty-state">No views in this range yet.</p>
      ) : (
        <VideoCarousel
          key={range}
          mode="trending"
          range={range}
          initialVideos={videos.map(toCarouselVideo)}
          brandPrefix={brandPrefix}
          brandSuffix={brandSuffix}
          visibleCount={CAROUSEL_PAGE_SIZE}
        />
      )}
    </section>
  );
}
