import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Détection hors connexion + nouvelle tentative automatique des navigations et Server Actions.
    useOffline: true,
    // forbidden() / unauthorized() : pages 403 / 401 déclenchées côté serveur.
    authInterrupts: true,
  },
  async redirects() {
    // Anciennes adresses du back-office (phase 0).
    return [
      { source: "/missions", destination: "/admin/missions", permanent: false },
      { source: "/missions/:path*", destination: "/admin/missions/:path*", permanent: false },
      { source: "/settings", destination: "/admin/settings", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
