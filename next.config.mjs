/** @type {import('next').NextConfig} */
import nextPWA from "next-pwa";
import runtimeCaching from "next-pwa/cache.js";

const withPWA = nextPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  // Disable in development to avoid service worker caching/reload loops.
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    // Cache Supabase GET requests for offline fallback.
    {
      urlPattern: ({ request, url }) => {
        if (request.method !== "GET") return false;
        const host = url.hostname.toLowerCase();
        const path = url.pathname;

        // Supabase REST/Auth/Storage endpoints are typically hosted on *.supabase.co
        const isSupabaseHost = host.endsWith(".supabase.co") || host.endsWith(".supabase.in");
        if (!isSupabaseHost) return false;

        // Only cache Supabase API resources (avoid conflicting with any other hosted paths).
        return (
          path.startsWith("/rest/") ||
          path.startsWith("/auth/") ||
          path.startsWith("/storage/") ||
          path.startsWith("/functions/") ||
          path.startsWith("/realtime/")
        );
      },
      handler: "NetworkFirst",
      options: {
        cacheName: "supabase-data-cache",
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries: 250,
          maxAgeSeconds: 24 * 60 * 60,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    // Cache key app routes for offline viewing (after first successful visit).
    {
      urlPattern: ({ request, url }) => {
        if (request.mode !== "navigate") return false;
        const path = url.pathname;
        return (
          path === "/" ||
          path === "/ledger" ||
          path.startsWith("/ledger/") ||
          path === "/customers" ||
          path.startsWith("/customers/")
        );
      },
      handler: "NetworkFirst",
      options: {
        cacheName: "hch-pages",
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    // Keep default caching for static assets/images/etc.
    ...runtimeCaching,
  ],
});

const nextConfig = {};

export default withPWA(nextConfig);
