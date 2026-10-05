import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = (
      process.env.INTERNAL_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:8000/api/v1"
    ).trim().replace(/\/+$/, "");

    return [
      { source: "/api/v1/:path*", destination: `${backendUrl}/:path*` },
      { source: "/api/health", destination: `${backendUrl.replace(/\/api\/v1$/, "")}/health` },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.pravatar.cc" },
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "http", hostname: "127.0.0.1", port: "8000" },
    ],
  },
};

export default nextConfig;
