/** @type {import('next').NextConfig} */
const nextConfig = {
  // L-5 修复：隐藏 Next.js 指纹
  poweredByHeader: false,
  // 强制转译 Spline 包（Next.js 14+ 标准配置）
  transpilePackages: ['@splinetool/react-spline', '@splinetool/runtime'],
  experimental: {},
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
      // 把 Spline WASM 请求代理到本地文件（修复 Vercel 生产环境 WASM 加载失败）
      {
        source: '/wasm/:package/:version/:file*',
        destination: '/wasm/:file*',
      },
      // 代理 unpkg.com 的 Spline WASM 请求到本地
      {
        source: '/unpkg-proxy/:path*',
        destination: 'https://unpkg.com/:path*',
      },
    ]
  },

  async redirects() {
    return [
      // 画布重定向
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
      // 实验室实验全屏跳转（无 iframe，全屏显示）
      {
        source: '/lab/flow',
        destination: '/experiments/sinuous/index.html',
        permanent: false,
      },
      {
        source: '/lab/sonic',
        destination: '/experiments/sonic/index.html',
        permanent: false,
      },
      {
        source: '/lab/touch',
        destination: '/experiments/touch/index.html',
        permanent: false,
      },
      {
        source: '/lab/propagation',
        destination: '/experiments/bacterium/index.html',
        permanent: false,
      },
      {
        source: '/lab/tide',
        destination: '/experiments/magnetic/index.html',
        permanent: false,
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
            value: 'SAMEORIGIN',
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
          // ⚠️ 'unsafe-eval' 必须保留：Spline 3D 场景的 WASM 模块需要动态编译
          // 'unsafe-inline' 暂时保留以兼容 React hydration，后续可通过 nonce 方案消除；
          // frame-src 中的 'unsafe-inline' 已移除（原无意义）
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'nonce-{}' blob: https://www.googletagmanager.com https://hm.baidu.com",
              "worker-src 'self' blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com https://alights.cn",
              "img-src 'self' data: blob: https://images.unsplash.com https://cdn.inew.land https://open.snmc.io https://*.vercel-blob.com https://*.public.blob.vercel-staging.com https://*.public.blob.vercel-storage.com https://*.xpccdn.com https://*.xinpianchang.com https://prod.spline.design https://*.spline.design https://hm.baidu.com",
              "media-src 'self' https://*.vercel-blob.com https://*.public.blob.vercel-staging.com https://*.public.blob.vercel-storage.com blob: https://gleitz.github.io",
              "connect-src 'self' https://www.googletagmanager.com https://api.openweathermap.org https://ipgeolocation.abstractapi.com https://api.cloudflare.com https://prod.spline.design https://*.spline.design https://unpkg.com https://*.unpkg.com https://gleitz.github.io https://hm.baidu.com https://cdn.jsdelivr.net",
              "frame-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
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
