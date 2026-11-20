import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ms/core", "@ms/api", "@ms/tokens"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.vimeocdn.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "assets.cdn.filesafe.space" },
    ],
  },
  poweredByHeader: false,
  // No floating dev badge over the rail (screenshots, design review).
  devIndicators: false,
  // Tailwind v4 via its Turbopack loader (there is no PostCSS config).
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
};

export default nextConfig;
