"use client";

import { useState } from "react";
import VideoCarousel, { type CarouselVideo } from "@/components/VideoCarousel";
import { CAROUSEL_PAGE_SIZE } from "@/lib/carousel";

type Props = {
  videos: CarouselVideo[];
  kicker: string;
  title: string;
  brandPrefix: string;
  brandSuffix: string;
};

export default function RandomVideosSection({
  videos: initialVideos,
  kicker,
  title,
  brandPrefix,
  brandSuffix,
}: Props) {
  const [videos, setVideos] = useState(initialVideos);
  const [refreshing, setRefreshing] = useState(false);
  // Bumped on every randomize so VideoCarousel remounts fresh (its own
  // scroll position, "exhausted" flag, etc. are otherwise only set up once
  // from its initial props and wouldn't reset just because this array did).
  const [carouselKey, setCarouselKey] = useState(0);

  async function handleRandomize() {
    setRefreshing(true);
    try {
      const excludeIds = videos.map((v) => v.id).join(",");
      let res = await fetch(`/api/random?take=${CAROUSEL_PAGE_SIZE}&excludeIds=${excludeIds}`);
      let data = await res.json();
      // A small catalog can run out of videos to exclude-and-replace with --
      // fall back to a plain random draw (repeats allowed) so the section
      // never goes empty just because someone clicked Randomize.
      if (!data.videos?.length) {
        res = await fetch(`/api/random?take=${CAROUSEL_PAGE_SIZE}`);
        data = await res.json();
      }
      if (data.videos?.length) {
        setVideos(data.videos);
        setCarouselKey((k) => k + 1);
      }
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <section id="random" className="catalog-section">
      <div className="section-heading">
        <div>
          <p className="section-kicker">{kicker}</p>
          <h2>{title}</h2>
        </div>
        <button
          type="button"
          onClick={handleRandomize}
          disabled={refreshing}
          className="randomize-button"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={refreshing ? "randomize-icon is-spinning" : "randomize-icon"}
          >
            <polyline points="16 3 21 3 21 8" />
            <line x1="4" y1="20" x2="21" y2="3" />
            <polyline points="21 16 21 21 16 21" />
            <line x1="15" y1="15" x2="21" y2="21" />
            <line x1="4" y1="4" x2="9" y2="9" />
          </svg>
          {refreshing ? "Randomizing…" : "Randomize"}
        </button>
      </div>
      <VideoCarousel
        key={carouselKey}
        mode="random"
        initialVideos={videos}
        brandPrefix={brandPrefix}
        brandSuffix={brandSuffix}
        visibleCount={CAROUSEL_PAGE_SIZE}
      />
    </section>
  );
}
