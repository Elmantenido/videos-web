import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import { checkEmbedPlayback } from "@/lib/embed-check";
import { syncManualPlaybackAlert } from "@/lib/video-alerts";

// How many videos get their playback checked concurrently. Each check is a
// live outbound fetch (up to ~10s), so this is bounded to avoid hammering
// many source sites at once and to limit concurrent SQLite writes.
const CONCURRENCY = 3;

/**
 * Streams one Server-Sent Event per video as its playback check completes,
 * so the admin "Verificar todos" button can show live progress instead of
 * blocking on the whole catalog before showing anything.
 */
export async function GET() {
  if (!(await isAuthenticated())) {
    return new Response("No autorizado", { status: 401 });
  }

  const videos = await prisma.video.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, slug: true, title: true, thumbnail: true, embedUrl: true },
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      send("start", { total: videos.length });

      let cursor = 0;
      let okCount = 0;
      let badCount = 0;

      async function worker() {
        while (cursor < videos.length) {
          const video = videos[cursor++];
          const result = await checkEmbedPlayback(video.embedUrl);
          if (result.ok) okCount++;
          else badCount++;

          await syncManualPlaybackAlert(video.id, result).catch(() => {});

          send("result", {
            videoId: video.id,
            slug: video.slug,
            title: video.title,
            thumbnail: video.thumbnail,
            ok: result.ok,
            reason: result.reason,
          });
        }
      }

      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, videos.length) || 1 }, worker)
      );

      send("done", { total: videos.length, ok: okCount, bad: badCount });
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
