/**
 * Fields safe to expose on public list/search/carousel endpoints. Deliberately
 * excludes embedUrl (and anything else not needed for a card/preview) so it
 * never rides along in an API response or a Server->Client component prop.
 */
export const PUBLIC_VIDEO_SELECT = {
  id: true,
  slug: true,
  title: true,
  thumbnail: true,
  duration: true,
  views: true,
} as const;
