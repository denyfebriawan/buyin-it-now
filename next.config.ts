import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Makes `next build` trace exactly which files are actually needed at
  // runtime (app code, the specific node_modules files actually reached,
  // nothing else) and copy just those into .next/standalone as a
  // self-contained server. Docker's final image copies only that folder,
  // not the whole node_modules tree or the build toolchain.
  output: "standalone",
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
