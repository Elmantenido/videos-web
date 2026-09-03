import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionSafely } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import NewPlaylistForm from "./NewPlaylistForm";

export const metadata: Metadata = { title: "Mis playlists", robots: { index: false, follow: true } };

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
              <span></span>Tu cuenta
            </p>
            <h2>Mis playlists</h2>
          </div>
        </div>

        <NewPlaylistForm />

        {playlists.length === 0 ? (
          <p className="empty-state">
            Todavía no creaste ninguna playlist. Guardá un video con el corazón desde su página, o creá
            una arriba.
          </p>
        ) : (
          <ul className="playlist-list">
            {playlists.map((p) => (
              <li key={p.id} className="playlist-list-item">
                <Link href={`/playlists/${p.slug}`}>{p.name}</Link>
                <span className="playlist-list-meta">
                  {p._count.items} videos · {p._count.followers} seguidores
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <SiteFooter copyright={s.footer_copyright} tagline={s.footer_tagline} adminLabel={s.footer_admin_link} keywordPhrase={s.footer_keyword_phrase} />
    </main>
  );
}
