import Link from "next/link";
import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/site-settings";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default async function NotFound() {
  const s = await getSiteSettings();

  return (
    <main>
      <SiteHeader brandPrefix={s.brand_prefix} brandSuffix={s.brand_suffix} />
      <div className="site-shell">
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <p className="section-kicker">404</p>
          <h1 className="text-3xl font-semibold">This page doesn&apos;t exist</h1>
          <p className="max-w-md text-[var(--muted)]">
            The video or page you&apos;re looking for may have been removed,
            renamed, or never existed.
          </p>
          <Link href="/" className="pagination-arrow">Back to home</Link>
        </div>
      </div>

      <SiteFooter copyright={s.footer_copyright} tagline={s.footer_tagline} adminLabel={s.footer_admin_link} />
    </main>
  );
}
