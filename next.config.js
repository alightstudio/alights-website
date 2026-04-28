/** @type {import('next').NextConfig} */
const nextConfig = {
  // L-5 修复：隐藏 Next.js 指纹
  poweredByHeader: false,
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
  async rewrites() {
    return [
      {
        source: '/lab/flow',
        destination: '/experiments/sinuous/index.html',
      },
      {
        source: '/lab/touch',
        destination: '/experiments/touch/index.html',
      },
      {
        source: '/lab/propagation',
        destination: '/experiments/bacterium/index.html',
      },
      {
        source: '/lab/tide',
        destination: '/experiments/magnetic/index.html',
      },
    ]
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
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // P3 修复：添加 HSTS (Strict-Transport-Security) 头部
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // P3 修复：添加 CSP (Content-Security-Policy) 头部
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com https://alights.cn",
              "img-src 'self' data: blob: https://images.unsplash.com https://cdn.inew.land https://open.snmc.io https://*.vercel-blob.com https://*.public.blob.vercel-staging.com https://*.xpccdn.com https://*.xinpianchang.com",
              "media-src 'self' https://*.vercel-blob.com https://*.public.blob.vercel-staging.com blob:",
              "connect-src 'self' https://www.googletagmanager.com https://api.openweathermap.org https://ipgeolocation.abstractapi.com https://api.cloudflare.com",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          // P3 修复：添加 X-XSS-Protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // P3 修复：添加 X-Download-Options（防止 IE/MIME 攻击）
          {
            key: 'X-Download-Options',
            value: 'noopen',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
