"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { voteVideo } from "@/app/actions/votes";
import { addVideoToPlaylist, getMyPlaylistsForVideo, removeVideoFromPlaylist } from "@/app/actions/playlists";

type PlaylistOption = { id: string; slug: string; name: string; hasVideo: boolean };

type Props = {
  videoId: number;
  initialLikes: number;
  initialDislikes: number;
  initialMyVote: 1 | -1 | null;
  loggedIn: boolean;
};

export default function VideoActions({ videoId, initialLikes, initialDislikes, initialMyVote, loggedIn }: Props) {
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [myVote, setMyVote] = useState(initialMyVote);
  const [isVoting, startVoteTransition] = useTransition();

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistOption[] | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isSaving, startSaveTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  const router = useRouter();
  const saved = playlists?.some((p) => p.hasVideo) ?? false;

  function vote(value: 1 | -1) {
    if (!loggedIn) {
      router.push("/sign-in");
      return;
    }
    const prevLikes = likes;
    const prevDislikes = dislikes;
    const prevVote = myVote;

    // Optimistic update mirroring the server's toggle logic.
    if (myVote === value) {
      setMyVote(null);
      if (value === 1) setLikes((n) => n - 1); else setDislikes((n) => n - 1);
    } else {
      setMyVote(value);
      if (value === 1) { setLikes((n) => n + 1); if (prevVote === -1) setDislikes((n) => n - 1); }
      else { setDislikes((n) => n + 1); if (prevVote === 1) setLikes((n) => n - 1); }
    }

    startVoteTransition(async () => {
      const result = await voteVideo(videoId, value);
      if (result.ok) {
        setLikes(result.likes);
        setDislikes(result.dislikes);
        setMyVote(result.myVote);
      } else {
        setLikes(prevLikes);
        setDislikes(prevDislikes);
        setMyVote(prevVote);
        if (result.error === "unauthenticated") router.push("/sign-in");
      }
    });
  }

  function openPopover() {
    if (!loggedIn) {
      router.push("/sign-in");
      return;
    }
    setPopoverOpen((open) => !open);
    if (!playlists) {
      startSaveTransition(async () => {
        const result = await getMyPlaylistsForVideo(videoId);
        if (result.ok) setPlaylists(result.playlists);
      });
    }
  }

  function toggleInPlaylist(playlist: PlaylistOption) {
    setSaveError(null);
    startSaveTransition(async () => {
      if (playlist.hasVideo) {
        const result = await removeVideoFromPlaylist(playlist.id, videoId);
        if (result.ok) {
          setPlaylists((prev) => prev?.map((p) => (p.id === playlist.id ? { ...p, hasVideo: false } : p)) ?? null);
        }
      } else {
        const result = await addVideoToPlaylist(videoId, playlist.id);
        if (result.ok) {
          setPlaylists((prev) => prev?.map((p) => (p.id === playlist.id ? { ...p, hasVideo: true } : p)) ?? null);
        }
      }
    });
  }

  function createAndAdd() {
    const name = newPlaylistName.trim();
    if (!name) return;
    setSaveError(null);
    startSaveTransition(async () => {
      const result = await addVideoToPlaylist(videoId, undefined, name);
      if (result.ok) {
        setNewPlaylistName("");
        setPlaylists((prev) => [{ id: result.playlistId, slug: result.slug, name, hasVideo: true }, ...(prev ?? [])]);
      } else {
        setSaveError("No se pudo crear la playlist.");
      }
    });
  }

  return (
    <div className="video-actions">
      <button
        type="button"
        onClick={() => vote(1)}
        disabled={isVoting}
        className={`vote-button ${myVote === 1 ? "is-active" : ""}`}
        aria-label="Like"
      >
        👍 <span>{likes}</span>
      </button>
      <button
        type="button"
        onClick={() => vote(-1)}
        disabled={isVoting}
        className={`vote-button ${myVote === -1 ? "is-active" : ""}`}
        aria-label="Dislike"
      >
        👎 <span>{dislikes}</span>
      </button>

      <div className="save-button-wrap">
        <button
          type="button"
          onClick={openPopover}
          className={`save-button ${saved ? "is-active" : ""}`}
          aria-label="Guardar en playlist"
        >
          {saved ? "♥" : "♡"} Guardar
        </button>

        {popoverOpen && (
          <div className="playlist-popover">
            {!playlists ? (
              <p className="playlist-popover-status">Cargando...</p>
            ) : (
              <>
                {playlists.length > 0 && (
                  <ul className="playlist-popover-list">
                    {playlists.map((p) => (
                      <li key={p.id}>
                        <button type="button" onClick={() => toggleInPlaylist(p)} disabled={isSaving}>
                          <span>{p.hasVideo ? "✓" : ""}</span> {p.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="playlist-popover-new">
                  <input
                    type="text"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="Nueva playlist..."
                  />
                  <button type="button" onClick={createAndAdd} disabled={isSaving || !newPlaylistName.trim()}>
                    Crear
                  </button>
                </div>
                {saveError && <p className="auth-error">{saveError}</p>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
