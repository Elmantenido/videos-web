"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { generatePlaylistSlug } from "@/lib/playlist-slug";

type ActionResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; error: "unauthenticated" | "not_found" | "forbidden" | "invalid_name" };

/** Playlists owned by the current user, with whether each already has `videoId`. */
export async function getMyPlaylistsForVideo(videoId: number) {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false as const, error: "unauthenticated" as const };

  const playlists = await prisma.playlist.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { items: { where: { videoId }, select: { id: true } } },
  });

  return {
    ok: true as const,
    playlists: playlists.map((p) => ({ id: p.id, slug: p.slug, name: p.name, hasVideo: p.items.length > 0 })),
  };
}

export async function createPlaylist(name: string): Promise<ActionResult<{ id: string; slug: string }>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "unauthenticated" };

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "invalid_name" };

  const slug = await generatePlaylistSlug();
  const playlist = await prisma.playlist.create({ data: { name: trimmed, slug, userId } });
  revalidatePath("/account");
  return { ok: true, id: playlist.id, slug: playlist.slug };
}

/** Creates a playlist (if `playlistId` is omitted) and/or adds a video to it in one step. */
export async function addVideoToPlaylist(
  videoId: number,
  playlistId?: string,
  newPlaylistName?: string
): Promise<ActionResult<{ playlistId: string; slug: string }>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "unauthenticated" };

  let playlist;
  if (playlistId) {
    playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist) return { ok: false, error: "not_found" };
    if (playlist.userId !== userId) return { ok: false, error: "forbidden" };
  } else {
    const trimmed = (newPlaylistName ?? "").trim();
    if (!trimmed) return { ok: false, error: "invalid_name" };
    const slug = await generatePlaylistSlug();
    playlist = await prisma.playlist.create({ data: { name: trimmed, slug, userId } });
  }

  await prisma.playlistItem.upsert({
    where: { playlistId_videoId: { playlistId: playlist.id, videoId } },
    update: {},
    create: { playlistId: playlist.id, videoId },
  });

  revalidatePath(`/playlists/${playlist.slug}`);
  revalidatePath("/account");
  return { ok: true, playlistId: playlist.id, slug: playlist.slug };
}

export async function removeVideoFromPlaylist(playlistId: string, videoId: number): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "unauthenticated" };

  const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
  if (!playlist) return { ok: false, error: "not_found" };
  if (playlist.userId !== userId) return { ok: false, error: "forbidden" };

  await prisma.playlistItem.deleteMany({ where: { playlistId, videoId } });
  revalidatePath(`/playlists/${playlist.slug}`);
  revalidatePath("/account");
  return { ok: true };
}

export async function followPlaylist(playlistId: string): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "unauthenticated" };

  const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
  if (!playlist) return { ok: false, error: "not_found" };

  await prisma.playlistFollow.upsert({
    where: { playlistId_userId: { playlistId, userId } },
    update: {},
    create: { playlistId, userId },
  });
  revalidatePath(`/playlists/${playlist.slug}`);
  return { ok: true };
}

export async function unfollowPlaylist(playlistId: string): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "unauthenticated" };

  const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
  if (!playlist) return { ok: false, error: "not_found" };

  await prisma.playlistFollow.deleteMany({ where: { playlistId, userId } });
  revalidatePath(`/playlists/${playlist.slug}`);
  return { ok: true };
}
