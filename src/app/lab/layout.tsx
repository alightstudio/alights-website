import type { Metadata } from 'next'
import '../globals.css'
import { COMPANY_NAME } from '@/lib/site-constants'

export const metadata: Metadata = {
  title: '栖光实验室 | Alights Lab',
  description: `${COMPANY_NAME} - 交互实验空间`,
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
