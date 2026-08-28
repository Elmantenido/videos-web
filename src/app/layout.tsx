import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSiteSettings } from "@/lib/site-settings";

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
    title: s.seo_site_title,
    description: s.seo_meta_description,
    keywords,
    openGraph: {
      title: s.seo_site_title,
      description: s.seo_meta_description,
      images: s.seo_og_image ? [s.seo_og_image] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: s.seo_site_title,
      description: s.seo_meta_description,
      images: s.seo_og_image ? [s.seo_og_image] : undefined,
    },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
