"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeVideoFromPlaylist } from "@/app/actions/playlists";

export default function RemoveVideoButton({ playlistId, videoId }: { playlistId: string; videoId: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleRemove() {
    startTransition(async () => {
      const result = await removeVideoFromPlaylist(playlistId, videoId);
      if (result.ok) router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={isPending}
      className="playlist-row-remove"
      aria-label="Remove from playlist"
      title="Remove from playlist"
    >
      ✕
    </button>
  );
}
