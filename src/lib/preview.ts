const LAZY_SRC_ATTRS = [
  "data-src",
  "data-original",
  "data-lazy-src",
  "data-lazy",
  "data-image",
  "data-echo",
  "src",
];

function isPlaceholder(url: string) {
  return (
    !url ||
    url.startsWith("data:image/gif") ||
    url.endsWith("blank.gif") ||
    url.endsWith("placeholder.png") ||
    url.trim() === ""
  );
}

function firstAttr(tag: string, names: string[]): string | null {
  for (const name of names) {
    const pattern = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i");
    const match = tag.match(pattern);
    if (match && !isPlaceholder(match[1])) return match[1];
  }
  return null;
}

export function extractPreviewImages(html: string): string[] {
  if (!html) return [];
  const urls: string[] = [];

  const imgTags = html.match(/<img\b[^>]*>/gi) ?? [];
  for (const tag of imgTags) {
    const url = firstAttr(tag, LAZY_SRC_ATTRS);
    if (url) urls.push(url);
  }

  const bgMatches = html.matchAll(/background-image\s*:\s*url\((['"]?)([^'")]+)\1\)/gi);
  for (const match of bgMatches) {
    if (!isPlaceholder(match[2])) urls.push(match[2]);
  }

  return Array.from(new Set(urls));
}
