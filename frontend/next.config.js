/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Recommended for new Next.js apps

  async rewrites() {
    return [
      {
        source: '/sitemap.xml',
        // Ensure NEXT_PUBLIC_BACKEND_URL is available at build time and runtime for this.
        // If it's only available at runtime (client-side), this needs a different approach,
        // like an API route in Next.js that fetches from backend.
        // However, for sitemap.xml, this rewrite should work if backend is accessible during request time.
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sitemap.xml`,
      },
    ];
  },
};

module.exports = nextConfig;
