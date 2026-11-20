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
};

export default nextConfig;
