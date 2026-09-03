"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export type VoteResult =
  | { ok: true; likes: number; dislikes: number; myVote: 1 | -1 | null }
  | { ok: false; error: "unauthenticated" };

async function countVotes(videoId: number) {
  const [likes, dislikes] = await Promise.all([
    prisma.videoVote.count({ where: { videoId, value: 1 } }),
    prisma.videoVote.count({ where: { videoId, value: -1 } }),
  ]);
  return { likes, dislikes };
}

/** Toggles a like/dislike: voting the same value again removes the vote. */
export async function voteVideo(videoId: number, value: 1 | -1): Promise<VoteResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: "unauthenticated" };

  const existing = await prisma.videoVote.findUnique({
    where: { videoId_userId: { videoId, userId } },
  });

  if (existing?.value === value) {
    await prisma.videoVote.delete({ where: { videoId_userId: { videoId, userId } } });
  } else {
    await prisma.videoVote.upsert({
      where: { videoId_userId: { videoId, userId } },
      update: { value },
      create: { videoId, userId, value },
    });
  }

  const { likes, dislikes } = await countVotes(videoId);
  const myVote = existing?.value === value ? null : value;
  return { ok: true, likes, dislikes, myVote };
}

export async function getVoteState(videoId: number) {
  const [{ likes, dislikes }, userId] = await Promise.all([
    countVotes(videoId),
    getCurrentUserId(),
  ]);

  let myVote: 1 | -1 | null = null;
  if (userId) {
    const mine = await prisma.videoVote.findUnique({
      where: { videoId_userId: { videoId, userId } },
    });
    myVote = (mine?.value as 1 | -1 | undefined) ?? null;
  }

  return { likes, dislikes, myVote };
}
