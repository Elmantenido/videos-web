import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { extractPreviewImages } from "@/lib/preview";
import { getSiteSettings } from "@/lib/site-settings";
import { absoluteUrl, toIsoDuration } from "@/lib/seo";
import SiteHeader from "@/components/SiteHeader";
import VideoPlayer from "@/components/VideoPlayer";
import ReportProblemButton from "@/components/ReportProblemButton";

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

type RelatedVideo = {
  id: number;
  slug: string;
  title: string;
  thumbnail: string | null;
  views: number;
};

function RelatedVideoRow({ video }: { video: RelatedVideo }) {
  return (
    <Link
      href={`/video/${video.slug}`}
      className="flex gap-3 rounded p-1 transition-colors hover:bg-white/5"
    >
      <div className="aspect-[2/3] w-20 flex-shrink-0 overflow-hidden rounded bg-white/10">
        {video.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnail}
            alt={video.title}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-3 text-sm text-gray-200">{video.title}</p>
        <p className="mt-1 text-xs text-gray-500">{video.views.toLocaleString()} views</p>
      </div>
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

  const s = await getSiteSettings();
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
          take: 5,
        })
      : Promise.resolve([]),
    categoryIds.length
      ? prisma.video.findMany({
          where: {
            published: true,
            NOT: { id: video.id },
            categories: { some: { id: { in: categoryIds } } },
          },
          orderBy: { views: "desc" },
          take: 10,
        })
      : Promise.resolve([]),
  ]);

  const upNext = seriesMatches;
  const usedIds = new Set([video.id, ...upNext.map((v) => v.id)]);
  const related = categoryMatches.filter((v) => !usedIds.has(v.id)).slice(0, 8);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: video.description ?? video.title,
    thumbnailUrl: video.thumbnail ?? undefined,
    uploadDate: video.createdAt.toISOString(),
    duration: toIsoDuration(video.duration),
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

          <div className="mt-4 flex flex-col gap-4 rounded-lg border border-white/10 p-4 sm:flex-row">
            {video.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={video.thumbnail}
                alt={video.title}
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
            </div>
          </div>

          {video.categories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {video.categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categoria/${category.slug}`}
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
            </div>
          )}

          <ReportProblemButton videoId={video.id} />
        </div>

        <aside className="flex flex-col gap-6">
          {upNext.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-gray-400">Up next</h2>
              <div className="flex flex-col gap-2">
                {upNext.map((r) => (
                  <RelatedVideoRow key={r.id} video={r} />
                ))}
              </div>
            </div>
          )}

          {related.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-gray-400">Related</h2>
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
              className="aspect-[9/10] w-full rounded object-cover"
            />
          ))}
        </div>
      )}
      </div>

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
