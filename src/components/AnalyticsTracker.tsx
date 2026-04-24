'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function AnalyticsTracker() {
  const pathname = usePathname()

  useEffect(() => {
    // 生成访客ID（存localStorage，30天有效期）
    const visitorId = localStorage.getItem('alights_visitor_id')
      || (() => {
        const id = Math.random().toString(36).slice(2)
        localStorage.setItem('alights_visitor_id', id)
        return id
      })()

    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname, visitorId }),
    }).catch(() => {}) // 不阻塞UI
  }, [pathname])

  return null
}
