"use client";

import { useState } from "react";

type Props = {
  videoId: number;
  thumbnail: string | null;
  title: string;
};

type Source = { isHtml: boolean; content: string };

export default function VideoPlayer({ videoId, thumbnail, title }: Props) {
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<Source | null>(null);

  async function handlePlay() {
    setLoading(true);
    try {
      const res = await fetch("/api/videos/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSource({ isHtml: data.isHtml, content: atob(data.payload) });
      }
    } finally {
      setLoading(false);
    }
  }

  if (source) {
    return source.isHtml ? (
      <div
        className="h-full w-full"
        dangerouslySetInnerHTML={{ __html: source.content }}
      />
    ) : (
      <iframe
        src={source.content}
        title={title}
        className="h-full w-full"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        // Without a sandbox, the third-party embed can navigate the whole
        // tab (window.top.location) -- a common ad-monetization tactic
        // that overwrites this page in browser history, so pressing back
        // afterward skips straight past it to whatever came before. This
        // permission set still lets the player itself run and use its own
        // origin, just not redirect or pop windows out from under the user.
        sandbox="allow-scripts allow-same-origin allow-presentation"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={handlePlay}
      disabled={loading}
      aria-label={`Play ${title}`}
      className="group relative h-full w-full cursor-pointer border-0 bg-black p-0"
    >
      {thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail}
          alt={title}
          width={1280}
          height={720}
          loading="eager"
          fetchPriority="high"
          className="h-full w-full object-cover"
        />
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-black/10 transition group-hover:bg-black/25">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-2xl text-black">
          {loading ? "…" : "▶"}
        </span>
      </span>
    </button>
  );
}
