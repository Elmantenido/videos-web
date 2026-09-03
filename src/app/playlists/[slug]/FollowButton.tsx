"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { followPlaylist, unfollowPlaylist } from "@/app/actions/playlists";

type Props = {
  playlistId: string;
  initialFollowing: boolean;
  initialFollowerCount: number;
  loggedIn: boolean;
};

export default function FollowButton({ playlistId, initialFollowing, initialFollowerCount, loggedIn }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialFollowerCount);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    if (!loggedIn) {
      router.push("/sign-in");
      return;
    }
    const next = !following;
    setFollowing(next);
    setCount((c) => c + (next ? 1 : -1));
    startTransition(async () => {
      const result = next ? await followPlaylist(playlistId) : await unfollowPlaylist(playlistId);
      if (!result.ok) {
        setFollowing(!next);
        setCount((c) => c + (next ? -1 : 1));
        if (result.error === "unauthenticated") router.push("/sign-in");
      }
    });
  }

  return (
    <button type="button" onClick={toggle} disabled={isPending} className={`follow-button ${following ? "is-following" : ""}`}>
      {following ? "Following" : "Follow"} <span>{count}</span>
    </button>
  );
}
