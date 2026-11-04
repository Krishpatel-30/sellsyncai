/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async rewrites() {
    // If running on Vercel without an external BACKEND_INTERNAL_URL, do not rewrite to 127.0.0.1.
    // Vercel security blocks private IPs with DNS_HOSTNAME_RESOLVED_PRIVATE (404).
    if (process.env.VERCEL && !process.env.BACKEND_INTERNAL_URL) {
      return [];
    }

    return [
      {
        source: "/api/v1/:path*",
        destination: process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8002/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;

