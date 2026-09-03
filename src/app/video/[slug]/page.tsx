import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { extractPreviewImages } from "@/lib/preview";
import { getSiteSettings } from "@/lib/site-settings";
import { absoluteUrl, toIsoDuration } from "@/lib/seo";
import { isEmbedUrl } from "@/lib/embed";
import { canaryMarker } from "@/lib/canary";
import { getSessionSafely } from "@/lib/session";
import { getVoteState } from "@/app/actions/votes";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import VideoPlayer from "@/components/VideoPlayer";
import ReportProblemButton from "@/components/ReportProblemButton";
import VideoActions from "@/components/VideoActions";

type Props = { params: Promise<{ slug: string }> };

function formatDurationMinutes(duration: string | null): string | null {
  if (!duration) return null;
  const parts = duration.split(":").map(Number);
  if (parts.some((p) => !Number.isFinite(p))) return duration;

  let totalSeconds: number;
  if (parts.length === 2) totalSeconds = parts[0] * 60 + parts[1];
  else if (parts.length === 3) totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  else return duration;

  return `${Math.round(totalSeconds / 60)} MIN`;
}

function formatReleasedDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

const RELEVANCE_STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "this", "that", "have", "are", "was", "were", "your", "you",
  "una", "unos", "unas", "para", "con", "del", "las", "los", "que", "por", "como", "esta", "este",
]);

// Combining diacritical marks (U+0300-U+036F), stripped after NFD
// normalization so accented and unaccented spellings of a word overlap.
const COMBINING_MARKS = new RegExp(`[\\u0300-\\u036f]`, "g");

function tokenizeForRelevance(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(COMBINING_MARKS, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !RELEVANCE_STOPWORDS.has(w))
  );
}

/** How close a candidate video is to the one being watched: same studio,
 * shared categories, and overlapping words in the description. */
function relevanceScore(
  current: { studio: string | null; description: string | null; categoryIds: Set<number> },
  candidate: { studio: string | null; description: string | null; categories: { id: number }[] }
): number {
  let score = 0;

  if (current.studio && candidate.studio && current.studio === candidate.studio) score += 6;

  const sharedCategories = candidate.categories.filter((c) => current.categoryIds.has(c.id)).length;
  score += sharedCategories * 3;

  if (current.description && candidate.description) {
    const currentWords = tokenizeForRelevance(current.description);
    const candidateWords = tokenizeForRelevance(candidate.description);
    let overlap = 0;
    for (const word of currentWords) if (candidateWords.has(word)) overlap++;
    score += Math.min(overlap, 8);
  }

  return score;
}

/**
 * Orders items randomly but weighted toward higher relevance, so "Related"
 * favors videos close to the one being watched without always showing the
 * exact same set in the exact same order (Efraimidis-Spirakis A-ES
 * weighted sampling: higher weight -> key closer to 1 more often, but
 * never guaranteed).
 */
function weightedRandomOrder<T>(items: T[], weightOf: (item: T) => number): T[] {
  return items
    .map((item) => ({ item, key: Math.random() ** (1 / (weightOf(item) + 1)) }))
    .sort((a, b) => b.key - a.key)
    .map((entry) => entry.item);
}

function extractTrailingNumber(title: string): number | null {
  const match = title.match(/(\d+)\s*$/);
  return match ? Number(match[1]) : null;
}

/**
 * Orders same-series siblings for "Up next" starting right after the
 * episode you're currently watching, wrapping back around to the earlier
 * ones at the end (e.g. watching "Name 2" of a 1-4 series -> 3, 4, 1).
 */
function orderSeriesForUpNext<T extends { title: string }>(currentTitle: string, siblings: T[]): T[] {
  const currentNum = extractTrailingNumber(currentTitle);
  if (currentNum === null) return siblings;

  const after: T[] = [];
  const wrapped: T[] = [];

  for (const sibling of siblings) {
    const n = extractTrailingNumber(sibling.title);
    if (n !== null && n > currentNum) after.push(sibling);
    else wrapped.push(sibling);
  }

  const byNumberAsc = (a: T, b: T) => {
    const na = extractTrailingNumber(a.title);
    const nb = extractTrailingNumber(b.title);
    if (na === null && nb === null) return a.title.localeCompare(b.title);
    if (na === null) return 1;
    if (nb === null) return -1;
    return na - nb;
  };

  after.sort(byNumberAsc);
  wrapped.sort(byNumberAsc);

  return [...after, ...wrapped];
}

type RelatedVideo = {
  id: number;
  slug: string;
  title: string;
  thumbnail: string | null;
  backgroundImage: string | null;
  views: number;
};

function RelatedVideoRow({ video }: { video: RelatedVideo }) {
  return (
    <Link
      href={`/video/${video.slug}`}
      className="flex gap-3 rounded p-1 transition-colors hover:bg-white/5"
    >
      <div className="aspect-[2/3] w-28 flex-shrink-0 overflow-hidden rounded bg-white/10">
        {video.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnail}
            alt={video.title}
            width={224}
            height={336}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-3 text-base text-gray-200">{video.title}</p>
        <p className="mt-1 text-xs text-gray-500">{video.views.toLocaleString()} views</p>
      </div>
    </Link>
  );
}

function UpNextCard({ video }: { video: RelatedVideo }) {
  const poster = video.backgroundImage || video.thumbnail;
  return (
    <Link
      href={`/video/${video.slug}`}
      className="group relative block aspect-video overflow-hidden rounded-lg bg-white/10"
    >
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt={video.title}
          width={640}
          height={360}
          loading="lazy"
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="line-clamp-2 text-base font-semibold leading-tight text-white">
          {video.title}
        </p>
        <p className="mt-0.5 text-xs text-gray-300">{video.views.toLocaleString()} views</p>
      </div>
    </Link>
  );
}

type RelatedPlaylist = {
  id: string;
  slug: string;
  name: string;
  ownerName: string | null;
  itemCount: number;
  followerCount: number;
};

function RelatedPlaylistRow({ playlist }: { playlist: RelatedPlaylist }) {
  return (
    <Link
      href={`/playlists/${playlist.slug}`}
      className="flex items-center justify-between rounded border border-white/10 p-3 transition-colors hover:border-[var(--lime)]"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-200">{playlist.name}</p>
        <p className="mt-0.5 text-xs text-gray-500">
          {playlist.ownerName ?? "Usuario"} · {playlist.itemCount} videos
        </p>
      </div>
      <span className="flex-shrink-0 text-xs text-gray-500">{playlist.followerCount} ♥</span>
    </Link>
  );
}

async function getVideo(slug: string) {
  return prisma.video.findUnique({
    where: { slug, published: true },
    include: { categories: true },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const video = await getVideo(slug);
  if (!video) return {};

  return {
    title: video.title,
    description: video.description ?? undefined,
    alternates: { canonical: absoluteUrl(`/video/${video.slug}`) },
    openGraph: {
      title: video.title,
      description: video.description ?? undefined,
      images: video.thumbnail ? [video.thumbnail] : undefined,
      url: absoluteUrl(`/video/${video.slug}`),
      type: "video.other",
    },
    twitter: {
      card: "summary_large_image",
      title: video.title,
      description: video.description ?? undefined,
      images: video.thumbnail ? [video.thumbnail] : undefined,
    },
  };
}

export default async function VideoPage({ params }: Props) {
  const { slug } = await params;
  const video = await getVideo(slug);
  if (!video) notFound();

  const [s, session, voteState, relatedPlaylistRows] = await Promise.all([
    getSiteSettings(),
    getSessionSafely(),
    getVoteState(video.id),
    prisma.playlist.findMany({
      where: { items: { some: { videoId: video.id } } },
      include: { user: { select: { name: true } }, _count: { select: { items: true, followers: true } } },
      orderBy: { followers: { _count: "desc" } },
      take: 6,
    }),
  ]);
  const relatedPlaylists: RelatedPlaylist[] = relatedPlaylistRows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    ownerName: p.user.name,
    itemCount: p._count.items,
    followerCount: p._count.followers,
  }));
  const previewImages = extractPreviewImages(video.previewHtml ?? "");

  const categoryIds = video.categories.map((c) => c.id);

  // Strip a trailing "Episode N" / "Ep N" / plain "N" so sequels/episodes of
  // the same series (e.g. "So low 3" -> "So low") surface as "Up next" first.
  const seriesBaseTitle = video.title.replace(/\s*(?:episode|ep\.?)?\s*\d+\s*$/i, "").trim();

  const [seriesMatches, categoryMatches] = await Promise.all([
    seriesBaseTitle.length >= 3
      ? prisma.video.findMany({
          where: { published: true, NOT: { id: video.id }, title: { contains: seriesBaseTitle } },
          orderBy: { title: "asc" },
        })
      : Promise.resolve([]),
    categoryIds.length || video.studio
      ? prisma.video.findMany({
          where: {
            published: true,
            NOT: { id: video.id },
            OR: [
              ...(categoryIds.length ? [{ categories: { some: { id: { in: categoryIds } } } }] : []),
              ...(video.studio ? [{ studio: video.studio }] : []),
            ],
          },
          include: { categories: true },
          take: 40,
        })
      : Promise.resolve([]),
  ]);

  const upNext = orderSeriesForUpNext(video.title, seriesMatches).slice(0, 5);
  const usedIds = new Set([video.id, ...upNext.map((v) => v.id)]);

  const currentCategoryIds = new Set(categoryIds);
  const relatedCandidates = categoryMatches.filter((v) => !usedIds.has(v.id));
  const related = weightedRandomOrder(relatedCandidates, (v) =>
    relevanceScore(
      { studio: video.studio, description: video.description, categoryIds: currentCategoryIds },
      v
    )
  ).slice(0, 7);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: video.description ?? video.title,
    thumbnailUrl: video.thumbnail ?? undefined,
    uploadDate: video.createdAt.toISOString(),
    duration: toIsoDuration(video.duration),
    // Google requires contentUrl or embedUrl alongside name/thumbnailUrl/
    // uploadDate. Only set when embedUrl is an actual URL (the alternative
    // is admin-pasted raw <video>/<iframe> HTML, which isn't a valid value
    // for this property).
    embedUrl: isEmbedUrl(video.embedUrl) ? video.embedUrl : undefined,
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/WatchAction",
      userInteractionCount: video.views,
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      ...(video.studio
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: video.studio,
              item: absoluteUrl(`/search?q=${encodeURIComponent(video.studio)}`),
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: video.studio ? 3 : 2,
        name: video.title,
        item: absoluteUrl(`/video/${video.slug}`),
      },
    ],
  };

  return (
    <main>
      <SiteHeader brandPrefix={s.brand_prefix} brandSuffix={s.brand_suffix} />
      <div className="mx-auto max-w-6xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
        <Link href="/" className="hover:underline">Home</Link>
        {video.studio && (
          <>
            {" / "}
            <Link href={`/search?q=${encodeURIComponent(video.studio)}`} className="hover:underline">
              {video.studio}
            </Link>
          </>
        )}
        {" / "}
        <span className="text-gray-300">{video.title}</span>
      </nav>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-black [&_iframe]:h-full [&_iframe]:w-full [&_video]:h-full [&_video]:w-full">
            <VideoPlayer
              videoId={video.id}
              thumbnail={video.backgroundImage || video.thumbnail}
              title={video.title}
            />
          </div>
          <h1 className="mt-4 text-2xl font-bold">{video.title}</h1>

          <div className="mt-4 flex flex-col gap-4 rounded-lg border border-white/10 p-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              {video.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  width={200}
                  height={300}
                  loading="eager"
                  className="aspect-[2/3] w-28 flex-shrink-0 self-start rounded object-cover"
                />
              )}
              <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                {video.studio && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Estudio
                    </p>
                    <p className="mt-0.5 font-semibold text-[var(--lime)]">{video.studio}</p>
                  </div>
                )}
                {video.duration && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Duración
                    </p>
                    <p className="mt-0.5 font-semibold text-gray-100">
                      {formatDurationMinutes(video.duration)}
                    </p>
                  </div>
                )}
                {video.releasedAt && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Released
                    </p>
                    <p className="mt-0.5 font-semibold text-gray-100">
                      {formatReleasedDate(video.releasedAt)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Views
                  </p>
                  <p className="mt-0.5 font-semibold text-gray-100">
                    {video.views.toLocaleString()}
                  </p>
                </div>
                {video.malScore && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Score
                    </p>
                    <p className="mt-0.5 font-semibold text-[var(--lime)]">{video.malScore}</p>
                  </div>
                )}
                {video.malRanked && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Ranked
                    </p>
                    <p className="mt-0.5 font-semibold text-gray-100">{video.malRanked}</p>
                  </div>
                )}
                {video.malPopularity && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Popularity
                    </p>
                    <p className="mt-0.5 font-semibold text-gray-100">{video.malPopularity}</p>
                  </div>
                )}
                {video.malMembers && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Members
                    </p>
                    <p className="mt-0.5 font-semibold text-gray-100">{video.malMembers}</p>
                  </div>
                )}
              </div>
            </div>

            {video.malUrl && (
              <a
                href={video.malUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-gray-300 hover:underline"
              >
                Stats via MyAnimeList: {video.malTitle} ↗
              </a>
            )}

            <ReportProblemButton videoId={video.id} />
          </div>

          {video.categories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {video.categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className="rounded-full border border-white/15 px-4 py-1.5 text-sm text-gray-300 transition-colors hover:border-[var(--lime)] hover:text-[var(--lime)]"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          )}

          {video.description && (
            <div className="mt-6 border-t border-white/10 pt-4">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Description
              </h2>
              <p className="leading-relaxed text-gray-300">{video.description}</p>
              <span style={{ display: "none" }} aria-hidden="true" data-cid={canaryMarker(video.id)} />
            </div>
          )}

          <VideoActions
            videoId={video.id}
            initialLikes={voteState.likes}
            initialDislikes={voteState.dislikes}
            initialMyVote={voteState.myVote}
            loggedIn={Boolean(session?.user)}
          />

          {relatedPlaylists.length > 0 && (
            <div className="mt-6 border-t border-white/10 pt-4">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Playlists con este video
              </h2>
              <div className="flex flex-col gap-2">
                {relatedPlaylists.map((p) => (
                  <RelatedPlaylistRow key={p.id} playlist={p} />
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-6">
          {upNext.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-gray-400">Up next</h2>
              <div className="flex flex-col gap-3">
                {upNext.map((r) => (
                  <UpNextCard key={r.id} video={r} />
                ))}
              </div>
            </div>
          )}

          {related.length > 0 && (
            <div>
              <h2 className="mb-3 text-base font-semibold text-gray-400">See more</h2>
              <div className="flex flex-col gap-2">
                {related.map((r) => (
                  <RelatedVideoRow key={r.id} video={r} />
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {previewImages.length > 0 && (
        <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(min(450px,100%),450px))] gap-3">
          {previewImages.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt={`${video.title} — captura ${i + 1}`}
              width={450}
              height={500}
              loading="lazy"
              className="aspect-[9/10] w-full rounded object-cover"
            />
          ))}
        </div>
      )}
      </div>

      <SiteFooter copyright={s.footer_copyright} tagline={s.footer_tagline} adminLabel={s.footer_admin_link} keywordPhrase={s.footer_keyword_phrase} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
    </main>
  );
}
