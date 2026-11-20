import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ms/core", "@ms/api", "@ms/tokens"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.vimeocdn.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  poweredByHeader: false,
  // Tailwind v4 via its Turbopack loader (there is no PostCSS config).
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
};

export default nextConfig;
