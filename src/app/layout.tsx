import type { Metadata } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import AIChatWidget from '@/components/AIChatWidget'
import AnalyticsTracker from '@/components/AnalyticsTracker'
import { prisma } from '@/lib/prisma'

// 默认 SEO fallback
const DEFAULT_SEO = {
  title: '栖光文化 | Alights - 专业视效制作',
  description: '西安栖光文化传播有限公司 - 专业视效制作 | TVC广告 · 产品动画 · 发布会 · 影视剧',
  keywords: '视效, TVC广告, 产品动画, 发布会, 影视剧, 西安, 栖光文化',
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const config = await prisma.siteConfig.findFirst({
      where: { key: 'seo' },
    })
    if (!config) return DEFAULT_SEO
    const seo = JSON.parse(config.value)
    return {
      title: seo.title || DEFAULT_SEO.title,
      description: seo.description || DEFAULT_SEO.description,
      keywords: seo.keywords || DEFAULT_SEO.keywords,
    }
  } catch {
    return DEFAULT_SEO
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-dark-900 text-white antialiased">
        <Navigation />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
        <AIChatWidget />
        <AnalyticsTracker />
      </body>
    </html>
  )
}
