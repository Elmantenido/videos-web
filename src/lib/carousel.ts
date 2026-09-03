// Kept in its own dependency-free module (not lib/home-data.ts) so client
// components like TrendingSection can import it without pulling in
// home-data's server-only chain (prisma, next/headers via lib/auth, etc.)
// into the browser bundle.
export const CAROUSEL_PAGE_SIZE = 6;
