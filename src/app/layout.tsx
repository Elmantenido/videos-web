import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSiteSettings } from "@/lib/site-settings";
import { siteUrl } from "@/lib/seo";
import VisitHeartbeat from "@/components/VisitHeartbeat";
import PageViewTracker from "@/components/PageViewTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  const keywords = s.seo_keywords
    ? s.seo_keywords.split(",").map((k) => k.trim()).filter(Boolean)
    : undefined;

  return {
    metadataBase: new URL(siteUrl()),
    title: s.seo_site_title,
    description: s.seo_meta_description,
    keywords,
    openGraph: {
      siteName: s.seo_site_title,
      title: s.seo_site_title,
      description: s.seo_meta_description,
      images: s.seo_og_image ? [s.seo_og_image] : undefined,
      locale: "es_ES",
    },
    twitter: {
      card: "summary_large_image",
      title: s.seo_site_title,
      description: s.seo_meta_description,
      images: s.seo_og_image ? [s.seo_og_image] : undefined,
    },
    // Next.js's Metadata type has a dedicated `google` field but no `bing`
    // one -- Bing's verification tag is <meta name="msvalidate.01" ...>,
    // which goes through the generic `other` bucket instead.
    verification:
      s.seo_google_site_verification || s.seo_bing_site_verification
        ? {
            google: s.seo_google_site_verification || undefined,
            other: s.seo_bing_site_verification
              ? { "msvalidate.01": s.seo_bing_site_verification }
              : undefined,
          }
        : undefined,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const s = await getSiteSettings();

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: s.seo_site_title,
    url: siteUrl(),
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl()}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: `${s.brand_prefix}${s.brand_suffix}`,
    url: siteUrl(),
    logo: s.seo_og_image || undefined,
  };

  return (
    // The site's visible text (nav, section titles, video metadata) is
    // English by default, so lang must match -- a mismatched lang attribute
    // sends search engines and screen readers the wrong signal.
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PageViewTracker />
        <VisitHeartbeat />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
      </body>
    </html>
  );
}
