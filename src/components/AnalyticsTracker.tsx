'use client'
import { useEffect } from 'react'

export default function AnalyticsTracker() {
  // ⚠️ usePathname 在 SSR 时返回 ''，客户端水合时返回实际路径
  // 放在 useEffect 里确保只在浏览器执行，避免 React 水合错误
  useEffect(() => {
    const pathname = window.location.pathname
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
    }).catch(() => {})
  }, [])

  return null
}
