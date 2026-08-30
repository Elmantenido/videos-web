import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { absoluteUrl } from "@/lib/seo";
import SiteHeader from "@/components/SiteHeader";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.category.findUnique({
    where: { slug },
    include: { _count: { select: { videos: true } } },
  });
  if (!category) return {};

  const title = `${category.name} — Videos`;
  const description = `Watch ${category._count.videos} ${category.name} video${category._count.videos === 1 ? "" : "s"}. Browse the full catalog and find your next favorite.`;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/categoria/${slug}`) },
    openGraph: { title, description, url: absoluteUrl(`/categoria/${slug}`) },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) notFound();

  const [videos, s] = await Promise.all([
    prisma.video.findMany({
      where: { categories: { some: { id: category.id } }, published: true },
      orderBy: { createdAt: "desc" },
    }),
    getSiteSettings(),
  ]);

  return (
    <main>
      <SiteHeader brandPrefix={s.brand_prefix} brandSuffix={s.brand_suffix} />
      <div className="mx-auto max-w-7xl px-4 py-8">
      <Link href="/" className="text-sm text-gray-500 hover:underline">
        ← All categories
      </Link>
      <h1 className="mt-2 mb-6 text-3xl font-bold">{category.name}</h1>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {videos.map((video, i) => (
          <Link
            key={video.id}
            href={`/video/${video.slug}`}
            className="group overflow-hidden rounded-lg border transition hover:shadow-md"
          >
            <div className="relative aspect-[2/3] w-full overflow-hidden bg-gray-100">
              {video.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  width={300}
                  height={450}
                  loading={i === 0 ? "eager" : "lazy"}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              )}
            </div>
            <div className="p-2">
              <h2 className="line-clamp-2 text-sm font-medium">{video.title}</h2>
            </div>
          </Link>
        ))}
      </section>

      {videos.length === 0 && (
        <p className="mt-10 text-center text-gray-500">
          No videos in this category yet.
        </p>
      )}
      </div>
    </main>
  );
}
