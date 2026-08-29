import crypto from "crypto";

const EXPIRY_SECONDS = 180; // signed link is valid for 3 minutes after play

function base64UrlSafe(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function ownHost(): string | null {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site) return null;
  try {
    return new URL(site).host;
  } catch {
    return null;
  }
}

/**
 * Signs a URL the same way Nginx's `secure_link` module expects
 * (`secure_link_md5 "$secure_link_expires$uri SECRET"`). Only signs URLs
 * that point at our own domain and only when VIDEO_LINK_SECRET is set --
 * third-party URLs (YouTube, Vimeo, etc.) are returned untouched since
 * signing them serves no purpose and Nginx isn't in that request path.
 */
export function signOwnVideoUrl(rawUrl: string): string {
  const secret = process.env.VIDEO_LINK_SECRET;
  const host = ownHost();
  if (!secret || !host) return rawUrl;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl;
  }
  if (url.host !== host) return rawUrl;

  const expires = Math.floor(Date.now() / 1000) + EXPIRY_SECONDS;
  const md5 = base64UrlSafe(
    crypto.createHash("md5").update(`${expires}${url.pathname} ${secret}`).digest()
  );

  url.searchParams.set("md5", md5);
  url.searchParams.set("expires", String(expires));
  return url.toString();
}

/** Signs the src of any <video>/<source> tag that points at our own domain. */
export function signVideoTagSources(html: string): string {
  return html.replace(
    /(<(?:video|source)\b[^>]*\bsrc\s*=\s*)(["'])([^"']+)\2/gi,
    (match, prefix, quote, src) => `${prefix}${quote}${signOwnVideoUrl(src)}${quote}`
  );
}
