'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface LeaderboardUser {
  rank: number
  userId: string
  userName: string
  pixels: number
  canvases: number
  namedCanvases: number
}

interface ActiveCanvasInfo {
  id: string
  width: number
  height: number
  name: string | null
  fillRate: number
  totalPixels: number
  totalCells: number
  topUsers: { rank: number; userId: string; userName: string; pixels: number }[]
}

interface Stats {
  totalUsers: number
  totalPixels: number
  totalCanvases: number
}

interface LeaderboardData {
  allTime: LeaderboardUser[]
  activeCanvas: ActiveCanvasInfo | null
  stats: Stats
}

export default function CanvasLeaderboard() {
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'active' | 'alltime'>('active')

  useEffect(() => {
    fetch('/api/canvas/leaderboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 py-8">
        <div className="h-4 w-40 bg-dark-700 rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-dark-700 rounded" />)}
        </div>
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 bg-dark-800 rounded" />)}
      </div>
    )
  }

  if (!data) {
    return <div className="text-center py-12 text-gray-500 text-sm">排行榜数据加载失败</div>
  }

  const { allTime, activeCanvas, stats } = data

  return (
    <div className="py-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-dark-800/50 border border-dark-700 p-5 text-center">
          <div className="text-2xl text-accent-gold font-display mb-1">{stats.totalUsers}</div>
          <div className="text-xs text-gray-500 tracking-widest uppercase">参与画手</div>
        </div>
        <div className="bg-dark-800/50 border border-dark-700 p-5 text-center">
          <div className="text-2xl text-accent-gold font-display mb-1">
            {stats.totalPixels >= 1000 ? (stats.totalPixels / 1000).toFixed(1) + 'k' : stats.totalPixels}
          </div>
          <div className="text-xs text-gray-500 tracking-widest uppercase">总像素数</div>
        </div>
        <div className="bg-dark-800/50 border border-dark-700 p-5 text-center">
          <div className="text-2xl text-accent-gold font-display mb-1">{stats.totalCanvases}</div>
          <div className="text-xs text-gray-500 tracking-widest uppercase">画布总数</div>
        </div>
      </div>

      {/* 子 Tab */}
      <div className="flex space-x-1 mb-5 border-b border-dark-700">
        <button onClick={() => setTab('active')}
          className={`px-5 py-2.5 text-sm tracking-wide transition-colors ${
            tab === 'active' ? 'text-white border-b border-white' : 'text-gray-500 hover:text-gray-300'
          }`}
        >当前画布</button>
        <button onClick={() => setTab('alltime')}
          className={`px-5 py-2.5 text-sm tracking-wide transition-colors ${
            tab === 'alltime' ? 'text-white border-b border-white' : 'text-gray-500 hover:text-gray-300'
          }`}
        >全时段排行</button>
      </div>

      {tab === 'active' ? (
        activeCanvas ? (
          <>
            <div className="bg-dark-800/30 border border-dark-700 p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">
                  {activeCanvas.name || '未命名画布'}
                  <span className="text-xs text-gray-600 ml-3">{activeCanvas.width}×{activeCanvas.height}</span>
                </span>
                <Link href="/canvas" className="text-xs text-accent-gold/70 hover:text-accent-gold">前往画板 →</Link>
              </div>
              <div className="flex justify-between text-xs text-gray-600 mb-1.5">
                <span>填充进度</span>
                <span>{activeCanvas.fillRate}%</span>
              </div>
              <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                <div className="h-full bg-accent-gold/50 rounded-full transition-all duration-500" style={{ width: activeCanvas.fillRate + '%' }} />
              </div>
            </div>
            <div className="space-y-1">
              {activeCanvas.topUsers.map(u => (
                <div key={u.userId}
                  className={`flex items-center justify-between px-4 py-3 transition-colors ${
                    u.rank === 1 ? 'bg-accent-gold/5 border border-accent-gold/20' : 'bg-dark-800/20 border border-dark-800/50 hover:border-dark-600'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className={`w-6 text-center text-base shrink-0 ${
                      u.rank === 1 ? 'text-accent-gold' : u.rank === 2 ? 'text-gray-300' : u.rank === 3 ? 'text-amber-600/70' : 'text-gray-600'
                    }`}>
                      {u.rank === 1 ? '🥇' : u.rank === 2 ? '🥈' : u.rank === 3 ? '🥉' : `#${u.rank}`}
                    </span>
                    <span className="text-sm text-white/80">{u.userName || '匿名'}</span>
                  </div>
                  <span className="text-sm text-gray-400">
                    <span className="text-accent-gold/70 font-mono">{u.pixels}</span>
                    <span className="text-gray-600 ml-1">px</span>
                  </span>
                </div>
              ))}
              {activeCanvas.topUsers.length === 0 && (
                <div className="text-center py-12 text-gray-600 text-sm">暂无像素数据</div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-600 text-sm border border-dark-800/50">暂无活跃画布</div>
        )
      ) : (
        <div className="space-y-0.5">
          {allTime.map(u => (
            <div key={u.userId}
              className={`flex items-center justify-between px-4 py-3 transition-colors ${
                u.rank === 1 ? 'bg-accent-gold/5 border border-accent-gold/20' :
                u.rank <= 3 ? 'bg-dark-800/30 border border-dark-700/50' :
                'bg-dark-900/50 border border-dark-900/50 hover:bg-dark-800/20'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <span className={`w-7 text-center text-base shrink-0 ${
                  u.rank === 1 ? 'text-accent-gold' : u.rank === 2 ? 'text-gray-300' : u.rank === 3 ? 'text-amber-600/70' : 'text-gray-600'
                }`}>
                  {u.rank <= 3 ? ['🥇', '🥈', '🥉'][u.rank - 1] : `#${u.rank}`}
                </span>
                <span className="text-sm text-white/80 truncate">{u.userName}</span>
                <div className="hidden sm:flex items-center space-x-2 text-xs text-gray-600">
                  <span>{u.canvases} 画布</span>
                  {u.namedCanvases > 0 && <span className="text-accent-gold/50">{u.namedCanvases} 命名</span>}
                </div>
              </div>
              <span className="text-sm text-gray-400 shrink-0 ml-4">
                <span className="text-accent-gold/70 font-mono">{u.pixels}</span>
                <span className="text-gray-600 ml-1">像素</span>
              </span>
            </div>
          ))}
          {allTime.length === 0 && (
            <div className="text-center py-12 text-gray-600 text-sm">暂无排行数据</div>
          )}
        </div>
      )}
    </div>
  )
}
