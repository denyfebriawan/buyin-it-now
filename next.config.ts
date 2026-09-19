import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Placeholder product photos. Replace with the real image host later.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/seed/**",
      },
    ],
  },
};

export default nextConfig;
