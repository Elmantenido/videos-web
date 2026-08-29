"use client";

import { useState } from "react";
import { isEmbedUrl, sanitizeEmbedCode } from "@/lib/embed";

type Props = {
  videoId: number;
  embedUrl: string;
  thumbnail: string | null;
  title: string;
};

export default function VideoPlayer({ videoId, embedUrl, thumbnail, title }: Props) {
  const [playing, setPlaying] = useState(false);

  function handlePlay() {
    setPlaying(true);
    fetch("/api/videos/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId }),
    }).catch(() => {});
  }

  if (playing) {
    return isEmbedUrl(embedUrl) ? (
      <iframe
        src={embedUrl}
        title={title}
        className="h-full w-full"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    ) : (
      <div
        className="h-full w-full"
        dangerouslySetInnerHTML={{ __html: sanitizeEmbedCode(embedUrl) }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={handlePlay}
      aria-label={`Play ${title}`}
      className="group relative h-full w-full cursor-pointer border-0 bg-black p-0"
    >
      {thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnail} alt={title} className="h-full w-full object-cover" />
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition group-hover:bg-black/40">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-2xl text-black">
          ▶
        </span>
      </span>
    </button>
  );
}
