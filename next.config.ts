import type { NextConfig } from "next";

// HSTS is ignored by browsers unless the response actually arrived over
// HTTPS, so it's safe to always send even though Next itself doesn't know
// whether nginx terminated TLS in front of it.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      // The category route moved from /categoria/:slug to /category/:slug.
      // Keep a permanent redirect so old links and any already-indexed
      // URLs still resolve instead of 404ing.
      {
        source: "/categoria/:slug",
        destination: "/category/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
