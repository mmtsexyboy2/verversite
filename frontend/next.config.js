/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Recommended for development
  async rewrites() {
    // This proxies requests from /api/... on the Next.js dev server
    // to your backend server running on port 8080.
    // This is only for development to avoid CORS issues.
    // In production, you'd configure your reverse proxy (e.g., Nginx)
    // or ensure backend and frontend are served from the same domain.
    return [
      {
        source: '/api/v1/:path*', // Matches any request to /api/v1/*
        destination: 'http://localhost:8080/api/v1/:path*', // Proxies to backend
      },
    ];
  },
};

module.exports = nextConfig;
