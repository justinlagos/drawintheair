/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // SECURITY FIX: Do not ignore lint errors — they catch security issues
    ignoreDuringBuilds: false,
  },
  typescript: {
    // SECURITY FIX: Do not ignore type errors — they catch logic bugs
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  // SECURITY: Disable x-powered-by header
  poweredByHeader: false,
}

module.exports = nextConfig
