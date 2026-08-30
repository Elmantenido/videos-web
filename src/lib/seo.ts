export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Converts a "MM:SS" or "H:MM:SS" duration string to ISO 8601 (e.g. "PT16M"). */
export function toIsoDuration(value: string | null): string | undefined {
  if (!value) return undefined;
  const parts = value.split(":").map(Number);
  if (parts.some((p) => !Number.isFinite(p) || p < 0)) return undefined;

  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  if (parts.length === 2) [minutes, seconds] = parts;
  else if (parts.length === 3) [hours, minutes, seconds] = parts;
  else return undefined;

  if (!hours && !minutes && !seconds) return undefined;
  return `PT${hours ? `${hours}H` : ""}${minutes ? `${minutes}M` : ""}${seconds ? `${seconds}S` : ""}`;
}
