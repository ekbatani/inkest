import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["archiver", "@node-rs/argon2", "postgres"],
  async redirects() {
    return [
      {
        source: "/help",
        destination: "/docs",
        permanent: true,
      },
      {
        source: "/doc",
        destination: "/docs",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
