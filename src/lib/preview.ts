export function extractPreviewImages(html: string): string[] {
  if (!html) return [];
  const urls: string[] = [];
  const imgTagPattern = /<img\b[^>]*>/gi;
  const srcPattern = /(?:src|data-src)\s*=\s*["']([^"']+)["']/i;

  const tags = html.match(imgTagPattern) ?? [];
  for (const tag of tags) {
    const match = tag.match(srcPattern);
    if (match) urls.push(match[1]);
  }

  return Array.from(new Set(urls));
}
