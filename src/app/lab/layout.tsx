import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '实验室 | 栖光文化 ALIGHTS',
  description: '栖光文化创意实验室——像素画布、光迹特效等互动实验项目，探索视觉艺术的边界。',
  openGraph: {
    title: '实验室 | 栖光文化 ALIGHTS',
    description: '像素画布、光迹特效等互动实验项目，探索视觉艺术的边界。',
    type: 'website',
  },
}

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
