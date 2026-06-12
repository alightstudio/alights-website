'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ReviewListItem {
  id: string
  title: string
  videoName: string
  status: string
  passcode: string
  createdAt: string
  _count: { comments: number }
}

export default function ReviewManagePage() {
  const [reviews, setReviews] = useState<ReviewListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/review')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        if (Array.isArray(data)) {
          setReviews(data)
        } else if (data && data.error) {
          setError(data.error)
        } else {
          setReviews([])
        }
      })
      .catch(err => {
        console.error('获取审片列表失败:', err)
        setError(err.message || '获取列表失败')
      })
      .finally(() => setLoading(false))
  }, [])

  const copyLink = (id: string, code: string) => {
    const url = `${window.location.origin}/review/${id}?code=${code}`
    navigator.clipboard.writeText(url)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white font-['Inter'] flex items-center justify-center">
        <div className="text-center px-6">
          <p className="text-lg text-zinc-400 mb-2">审片数据暂时无法加载</p>
          <p className="text-sm text-zinc-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-400 hover:text-white transition-colors"
          >
            重试
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white font-['Inter']">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-light tracking-tight mb-2">审片管理</h1>
            <p className="text-sm text-zinc-500">管理所有审片链接和批注反馈</p>
          </div>
          <Link
            href="/review/upload"
            className="px-5 py-2.5 bg-white text-black text-sm font-medium rounded-lg
                       hover:bg-zinc-200 transition-all"
          >
            + 新建审片
          </Link>
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-20 text-zinc-600">
            <p className="text-lg mb-2">还没有审片记录</p>
            <Link href="/review/upload" className="text-sm text-zinc-400 hover:text-white underline underline-offset-4">
              创建第一个 →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map(r => (
              <div
                key={r.id}
                className="flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-lg
                           hover:bg-zinc-900/80 transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-zinc-200 truncate">{r.title}</h3>
                  <p className="text-xs text-zinc-600 mt-1">
                    {r.videoName} · {r._count.comments} 条批注 · 访问码: <span className="font-mono text-yellow-400/80">{r.passcode}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${
                    r.status === 'ACTIVE'
                      ? 'bg-green-900/30 text-green-400 border border-green-800/50'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {r.status === 'ACTIVE' ? '进行中' : r.status === 'COMPLETED' ? '已完成' : '已归档'}
                  </span>
                  <button
                    onClick={() => copyLink(r.id, r.passcode)}
                    className="px-3 py-1.5 bg-zinc-800 rounded text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    复制链接
                  </button>
                  <Link
                    href={`/review/${r.id}?code=${r.passcode}`}
                    className="px-3 py-1.5 bg-zinc-800 rounded text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    查看
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
