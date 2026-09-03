"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPlaylist } from "@/app/actions/playlists";

export default function NewPlaylistForm() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createPlaylist(name);
      if (!result.ok) {
        setError(result.error === "invalid_name" ? "Give the playlist a name." : "Couldn't create the playlist.");
        return;
      }
      router.push(`/playlists/${result.slug}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="new-playlist-form">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New playlist name"
        required
        className="auth-input"
      />
      <button type="submit" disabled={isPending} className="auth-button">
        {isPending ? "Creating..." : "Create Playlist"}
      </button>
      {error && <p className="auth-error">{error}</p>}
    </form>
  );
}
