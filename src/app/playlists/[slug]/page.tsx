import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSessionSafely } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import VideoGridSection from "@/components/VideoGridSection";
import FollowButton from "./FollowButton";

type Props = { params: Promise<{ slug: string }> };

async function getPlaylist(slug: string) {
  return prisma.playlist.findUnique({
    where: { slug },
    include: {
      user: { select: { id: true, name: true } },
      items: {
        orderBy: { addedAt: "desc" },
        include: { video: { include: { categories: true } } },
      },
      _count: { select: { followers: true } },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const playlist = await getPlaylist(slug);
  if (!playlist) return { title: "Playlist" };
  return {
    title: playlist.name,
    description: `Playlist de ${playlist.user.name ?? "un usuario"} con ${playlist.items.length} videos.`,
  };
}

export default async function PlaylistPage({ params }: Props) {
  const { slug } = await params;
  const [playlist, session, s] = await Promise.all([getPlaylist(slug), getSessionSafely(), getSiteSettings()]);
  if (!playlist) notFound();

  const userId = session?.user?.id;
  const isOwner = userId === playlist.userId;
  const isFollowing = userId
    ? await prisma.playlistFollow.findUnique({
        where: { playlistId_userId: { playlistId: playlist.id, userId } },
      }).then(Boolean)
    : false;

  const videos = playlist.items
    .filter((item) => item.video.published)
    .map((item) => item.video);

  return (
    <main>
      <SiteHeader brandPrefix={s.brand_prefix} brandSuffix={s.brand_suffix} />
      <div className="site-shell">
        <div className="category-strip">
          <div>
            <p className="section-kicker">
              <span></span>Playlist de {playlist.user.name ?? "un usuario"}
            </p>
            <h2>{playlist.name}</h2>
          </div>
          {!isOwner && (
            <FollowButton
              playlistId={playlist.id}
              initialFollowing={isFollowing}
              initialFollowerCount={playlist._count.followers}
              loggedIn={Boolean(userId)}
            />
          )}
        </div>

        <VideoGridSection
          kicker="Playlist"
          title={playlist.name}
          hideHeading
          videos={videos}
          emptyStateText="Esta playlist todavía no tiene videos."
          page={1}
          totalPages={1}
          basePath={`/playlists/${slug}`}
          brandPrefix={s.brand_prefix}
          brandSuffix={s.brand_suffix}
        />
      </div>
      <SiteFooter copyright={s.footer_copyright} tagline={s.footer_tagline} adminLabel={s.footer_admin_link} keywordPhrase={s.footer_keyword_phrase} />
    </main>
  );
}
