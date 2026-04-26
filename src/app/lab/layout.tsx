import type { Metadata } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  title: '栖光实验室 | Alights Lab',
  description: '西安栖光文化传播有限公司 - 交互实验空间',
}

export default function LabLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-dark-950 min-h-screen">
      {children}
    </div>
  )
}
