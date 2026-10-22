import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces .next/standalone for a small production Docker image
  output: "standalone",
};

export default nextConfig;
