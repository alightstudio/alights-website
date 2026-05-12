import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '社区 | 栖光 · Alights',
  description: '栖光文化社区——视觉特效从业者交流平台，TVC广告、产品动画、AIGC、发布会大屏、影视剧创作分享。',
  openGraph: {
    title: '社区 | 栖光 · Alights',
    description: '栖光文化社区——视觉特效从业者交流平台，TVC广告、产品动画、AIGC、发布会大屏、影视剧创作分享。',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '社区 | 栖光 · Alights',
    description: '栖光文化社区——视觉特效从业者交流平台，TVC广告、产品动画、AIGC、发布会大屏、影视剧创作分享。',
  },
}

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
