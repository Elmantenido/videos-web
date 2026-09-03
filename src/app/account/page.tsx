import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionSafely } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import NewPlaylistForm from "./NewPlaylistForm";
import DeletePlaylistButton from "./DeletePlaylistButton";

export const metadata: Metadata = { title: "My Playlists", robots: { index: false, follow: true } };

export default async function AccountPage() {
  const session = await getSessionSafely();
  if (!session?.user?.id) redirect("/sign-in");

  const [s, playlists] = await Promise.all([
    getSiteSettings(),
    prisma.playlist.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { items: true, followers: true } } },
    }),
  ]);

  return (
    <main>
      <SiteHeader brandPrefix={s.brand_prefix} brandSuffix={s.brand_suffix} />
      <div className="site-shell">
        <div className="category-strip">
          <div>
            <p className="section-kicker">
              <span></span>Your account
            </p>
            <h2>My Playlists</h2>
          </div>
        </div>

        <NewPlaylistForm />

        {playlists.length === 0 ? (
          <p className="empty-state">
            You haven&apos;t created any playlists yet. Save a video with the heart button from its page,
            or create one above.
          </p>
        ) : (
          <ul className="playlist-list">
            {playlists.map((p) => (
              <li key={p.id} className="playlist-list-item">
                <div>
                  <Link href={`/playlists/${p.slug}`}>{p.name}</Link>
                  <span className="playlist-list-meta">
                    {p._count.items} videos · {p._count.followers} followers
                  </span>
                </div>
                <DeletePlaylistButton playlistId={p.id} playlistName={p.name} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <SiteFooter copyright={s.footer_copyright} tagline={s.footer_tagline} adminLabel={s.footer_admin_link} keywordPhrase={s.footer_keyword_phrase} partnersHtml={s.footer_partners_html} />
    </main>
  );
}
