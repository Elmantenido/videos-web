import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { extractPreviewImages } from "@/lib/preview";
import { getSiteSettings } from "@/lib/site-settings";
import SiteHeader from "@/components/SiteHeader";
import VideoPlayer from "@/components/VideoPlayer";
import ReportProblemButton from "@/components/ReportProblemButton";

type Props = { params: Promise<{ slug: string }> };

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
    openGraph: {
      title: video.title,
      description: video.description ?? undefined,
      images: video.thumbnail ? [video.thumbnail] : undefined,
      type: "video.other",
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

  const related = await prisma.video.findMany({
    where: {
      published: true,
      ...(categoryIds.length
        ? { categories: { some: { id: { in: categoryIds } } } }
        : {}),
      NOT: { id: video.id },
    },
    take: 8,
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: video.description ?? video.title,
    thumbnailUrl: video.thumbnail ?? undefined,
    uploadDate: video.createdAt.toISOString(),
  };

  return (
    <main>
      <SiteHeader brandPrefix={s.brand_prefix} brandSuffix={s.brand_suffix} />
      <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/" className="text-sm text-gray-500 hover:underline">
        ← Back
      </Link>

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
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
            {video.studio && <span>{video.studio}</span>}
            <span>{video.views.toLocaleString()} views</span>
          </div>
          {video.categories.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-2">
              {video.categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categoria/${category.slug}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          )}
          {video.description && (
            <p className="mt-3 text-gray-700">{video.description}</p>
          )}
          {previewImages.length > 0 && (
            <div className="mt-4 grid grid-cols-5 gap-1.5">
              {previewImages.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt=""
                  className="aspect-video w-full rounded object-cover"
                />
              ))}
            </div>
          )}
          <ReportProblemButton videoId={video.id} />
        </div>

        <aside>
          <h2 className="mb-3 text-sm font-semibold text-gray-500">
            Related
          </h2>
          <div className="flex flex-col gap-3">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/video/${r.slug}`}
                className="flex gap-2 rounded hover:bg-gray-50"
              >
                <div className="h-16 w-28 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                  {r.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.thumbnail}
                      alt={r.title}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <span className="line-clamp-2 text-sm">{r.title}</span>
              </Link>
            ))}
          </div>
        </aside>
      </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
