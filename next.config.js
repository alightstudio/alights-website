/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Disable all chunk splitting to inline everything
      config.optimization.splitChunks = {
        chunks: 'async',  // Only split async (dynamic import) chunks, not initial
        cacheGroups: {
          default: false,
          vendors: false,
        },
      }
    }
    return config
  },
  async redirects() {
    return [
      {
        source: '/canvas',
        destination: '/lab/canvas',
        permanent: true,
      },
      {
        source: '/canvas/:path*',
        destination: '/lab/canvas/:path*',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Referrer-Policy',
            value: 'no-referrer',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
