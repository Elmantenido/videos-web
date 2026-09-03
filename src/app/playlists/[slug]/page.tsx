import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSessionSafely } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import FollowButton from "./FollowButton";
import RemoveVideoButton from "./RemoveVideoButton";
import DeletePlaylistButton from "@/app/account/DeletePlaylistButton";

type Props = { params: Promise<{ slug: string }> };

async function getPlaylist(slug: string) {
  return prisma.playlist.findUnique({
    where: { slug },
    include: {
      user: { select: { id: true, name: true } },
      items: {
        orderBy: { addedAt: "desc" },
        include: {
          video: {
            select: { id: true, slug: true, title: true, thumbnail: true, duration: true, views: true, published: true },
          },
        },
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
    description: `Playlist by ${playlist.user.name ?? "a user"} with ${playlist.items.length} videos.`,
  };
}

export default async function PlaylistPage({ params }: Props) {
  const { slug } = await params;
  const [playlist, session, s] = await Promise.all([getPlaylist(slug), getSessionSafely(), getSiteSettings()]);
  if (!playlist) notFound();

  const userId = session?.user?.id;
  const isOwner = userId === playlist.userId;
  const isFollowing = userId
    ? await prisma.playlistFollow
        .findUnique({ where: { playlistId_userId: { playlistId: playlist.id, userId } } })
        .then(Boolean)
    : false;

  const videos = playlist.items.filter((item) => item.video.published).map((item) => item.video);
  const cover = videos[0]?.thumbnail ?? null;

  return (
    <main>
      <SiteHeader brandPrefix={s.brand_prefix} brandSuffix={s.brand_suffix} />
      <div className="site-shell">
        <div className="playlist-header">
          <div className="playlist-cover">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt={playlist.name} width={300} height={450} />
            ) : (
              <div className="no-thumbnail">{s.brand_prefix}{s.brand_suffix}</div>
            )}
          </div>
          <div className="playlist-header-info">
            <p className="section-kicker"><span></span>Playlist</p>
            <h1>{playlist.name}</h1>
            <p className="playlist-owner">By {playlist.user.name ?? "a user"}</p>
            <p className="playlist-meta-line">
              {videos.length} video{videos.length === 1 ? "" : "s"} · {playlist._count.followers} follower
              {playlist._count.followers === 1 ? "" : "s"}
            </p>
            <div className="playlist-header-actions">
              {videos.length > 0 && (
                <Link href={`/video/${videos[0].slug}`} className="primary-button">
                  <span>▶</span> Play all
                </Link>
              )}
              {isOwner ? (
                <DeletePlaylistButton playlistId={playlist.id} playlistName={playlist.name} redirectTo="/account" />
              ) : (
                <FollowButton
                  playlistId={playlist.id}
                  initialFollowing={isFollowing}
                  initialFollowerCount={playlist._count.followers}
                  loggedIn={Boolean(userId)}
                />
              )}
            </div>
          </div>
        </div>

        {videos.length === 0 ? (
          <p className="empty-state">This playlist doesn&apos;t have any videos yet.</p>
        ) : (
          <ol className="playlist-video-list">
            {videos.map((video, i) => (
              <li key={video.id} className="playlist-row">
                <span className="playlist-row-index">{i + 1}</span>
                <Link href={`/video/${video.slug}`} className="playlist-row-thumb">
                  {video.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={video.thumbnail} alt={video.title} width={120} height={180} loading="lazy" />
                  ) : (
                    <div className="no-thumbnail">{s.brand_prefix}{s.brand_suffix}</div>
                  )}
                  {video.duration && <span className="duration">{video.duration}</span>}
                </Link>
                <Link href={`/video/${video.slug}`} className="playlist-row-meta">
                  <h3>{video.title}</h3>
                  <p className="video-views">{video.views.toLocaleString()} views</p>
                </Link>
                {isOwner && <RemoveVideoButton playlistId={playlist.id} videoId={video.id} />}
              </li>
            ))}
          </ol>
        )}
      </div>
      <SiteFooter copyright={s.footer_copyright} tagline={s.footer_tagline} adminLabel={s.footer_admin_link} keywordPhrase={s.footer_keyword_phrase} partnersHtml={s.footer_partners_html} />
    </main>
  );
}
