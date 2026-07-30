import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.mos.cms.futurecdn.net",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co", 
      },
      {
        protocol: "https",
        hostname: "thenobleartist.com",
      },
    ],
  },
};

export default nextConfig;