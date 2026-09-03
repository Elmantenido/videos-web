"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePlaylist } from "@/app/actions/playlists";

type Props = { playlistId: string; playlistName: string; redirectTo?: string };

export default function DeletePlaylistButton({ playlistId, playlistName, redirectTo }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!window.confirm(`Delete "${playlistName}"? This can't be undone.`)) return;
    startTransition(async () => {
      const result = await deletePlaylist(playlistId);
      if (result.ok) {
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      }
    });
  }

  return (
    <button type="button" onClick={handleDelete} disabled={isPending} className="playlist-delete-button" aria-label="Delete playlist">
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}
