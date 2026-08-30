import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
