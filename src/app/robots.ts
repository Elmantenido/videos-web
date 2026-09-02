import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /preview-full es un honeypot (ver HoneypotLink.tsx): ningún
      // crawler legítimo debería pedirla nunca. No es contenido real.
      disallow: ["/admin", "/api", "/preview-full"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
