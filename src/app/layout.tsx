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
    verification: s.seo_google_site_verification
      ? { google: s.seo_google_site_verification }
      : undefined,
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PageViewTracker />
        <VisitHeartbeat />
      </body>
    </html>
  );
}
