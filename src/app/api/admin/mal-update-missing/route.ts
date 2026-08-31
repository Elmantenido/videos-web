import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import { lookupMyAnimeListWithFallback, randomDelay } from "@/lib/mal-lookup";

// Videos are looked up one at a time (no concurrency pool, unlike
// verify-all's playback checks) with a randomized pause between requests
// (a perfectly even cadence is itself a bot signature). Unlike playback
// checks, which hit many different video-host domains, every one of these
// requests goes to the same external site -- MyAnimeList, behind Akamai's
// bot protection -- and this project has already been IP-blocked once
// before for scraping too aggressively, so this deliberately runs slow.
const DELAY_MS_MIN = 2000;
const DELAY_MS_MAX = 4000;

// Each run only takes a small batch of the videos still missing MAL data,
// instead of the whole catalog at once -- fewer requests to MyAnimeList per
// click keeps this well under the radar of its anti-bot protection. Videos
// that get a match here drop out of the "still missing" set, so clicking
// the button again naturally picks up the next batch.
const BATCH_SIZE = 25;

/**
 * Streams one Server-Sent Event per video as its MyAnimeList lookup
 * completes, so the admin "AnimeList" bulk-update button can show live
 * progress. Any match found is saved immediately; the final "done" event
 * doesn't carry the unmatched list itself -- the client builds that from
 * the "result" events it already received.
 */
export async function GET() {
  if (!(await isAuthenticated())) {
    return new Response("No autorizado", { status: 401 });
  }

  const where = { malTitle: null };

  const [videos, remainingBefore] = await Promise.all([
    prisma.video.findMany({
      where,
      // Never-checked videos (malCheckedAt null) go first; among those
      // already checked without luck, the oldest checks are retried first.
      orderBy: [{ malCheckedAt: "asc" }, { createdAt: "desc" }],
      take: BATCH_SIZE,
      select: { id: true, slug: true, title: true, thumbnail: true, description: true },
    }),
    prisma.video.count({ where }),
  ]);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      send("start", { total: videos.length, remainingBefore });

      let matchedCount = 0;
      let unmatchedCount = 0;
      let processedCount = 0;
      let stopReason: string | null = null;

      for (const video of videos) {
        let match;
        try {
          match = await lookupMyAnimeListWithFallback(video.title, video.description);
        } catch (err) {
          // A thrown error means the request itself failed (network issue,
          // or MyAnimeList's anti-bot layer rejecting it) -- not "no match
          // found". Continuing to fire off the rest of the batch against a
          // site that's already rejecting us would only make things worse,
          // so the whole run stops here instead of quietly mislabeling the
          // remaining videos as unmatched.
          stopReason = err instanceof Error ? err.message : "error desconocido";
          break;
        }

        processedCount++;
        if (match) {
          matchedCount++;
          await prisma.video.update({
            where: { id: video.id },
            data: {
              malTitle: match.title,
              malUrl: match.url,
              malScore: match.score,
              malRanked: match.ranked,
              malPopularity: match.popularity,
              malMembers: match.members,
              malCheckedAt: new Date(),
            },
          });
        } else {
          unmatchedCount++;
        }

        send("result", {
          videoId: video.id,
          slug: video.slug,
          title: video.title,
          thumbnail: video.thumbnail,
          matched: Boolean(match),
          malTitle: match?.title ?? null,
        });

        await randomDelay(DELAY_MS_MIN, DELAY_MS_MAX);
      }

      const remainingAfter = remainingBefore - matchedCount;
      send("done", {
        total: processedCount,
        matched: matchedCount,
        unmatched: unmatchedCount,
        remainingAfter,
        stopReason,
      });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
    },
  });
}
