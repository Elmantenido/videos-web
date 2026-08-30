import { prisma } from "@/lib/prisma";
import { validateEmbedFormat, type PlaybackCheckResult } from "@/lib/embed-check";

type AlertSource = "auto" | "manual";

/** Each source ("auto" format check vs. "manual"/bulk playback check) owns
 * only its own alerts, so one kind never clobbers or masks the other. */
async function syncAlert(videoId: number, source: AlertSource, reason: string | null) {
  const existing = await prisma.videoAlert.findFirst({
    where: { videoId, source, resolved: false },
  });

  if (reason) {
    if (existing) {
      await prisma.videoAlert.update({ where: { id: existing.id }, data: { reason } });
    } else {
      await prisma.videoAlert.create({ data: { videoId, source, reason } });
    }
  } else if (existing) {
    await prisma.videoAlert.update({ where: { id: existing.id }, data: { resolved: true } });
  }
}

export function syncAutoEmbedAlert(videoId: number, embedUrl: string) {
  return syncAlert(videoId, "auto", validateEmbedFormat(embedUrl));
}

export function syncManualPlaybackAlert(videoId: number, result: PlaybackCheckResult) {
  return syncAlert(videoId, "manual", result.ok ? null : result.reason);
}
