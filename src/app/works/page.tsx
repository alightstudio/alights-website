'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { trackWorkClick } from '@/lib/points'
import { proxyImageUrl } from '@/lib/proxy-image'
import xpcWorksRaw from '@/data/xpc-works.json'

interface WorksWork {
  id: string
  title: string
  videoUrl: string
  thumbnail: string
  duration: number
  categories: string
  views: number
  likes: number
  collects: number
  heat: number
  score: number
  author: string
}

function transform(w: any): WorksWork {
  return {
    id: w.id.toString(),
    title: w.title,
    videoUrl: w.web_url,
    thumbnail: w.cover,
    duration: w.duration,
    categories: w.categories,
    views: w.count_view || 0,
    likes: w.count_like || 0,
    collects: w.count_collect || 0,
    heat: w.count_score || (w.count_view + w.count_like * 5 + w.count_collect * 10),
    score: w.count_score || 0,
    author: w.author || '未知',
  }
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

const rawWorks = (xpcWorksRaw as any[]).map(transform)

function sortByHeat(a: WorksWork, b: WorksWork) { return (b.score || b.heat || 0) - (a.score || a.heat || 0) }
function sortByViews(a: WorksWork, b: WorksWork) { return (b.views || 0) - (a.views || 0) }

export default function WorksPage() {
  const router = useRouter()
  const [sortMode, setSortMode] = useState<'heat' | 'views'>('heat')
  const [sorted, setSorted] = useState<WorksWork[]>(rawWorks)

  useEffect(() => {
    if (!localStorage.getItem('userId')) {
      router.replace('/login')
    }
  }, [router])

  useEffect(() => {
    setSorted(sortMode === 'heat' ? [...rawWorks].sort(sortByHeat) : [...rawWorks].sort(sortByViews))
  }, [sortMode])

  const totalViews = rawWorks.reduce((s: number, w: WorksWork) => s + (w.views || 0), 0)
  const totalScore = rawWorks.reduce((s: number, w: WorksWork) => s + (w.score || 0), 0)

  return (
    <div className="pt-24 pb-32 px-6 md:px-12 lg:px-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <h1 className="font-display text-5xl md:text-6xl font-light mb-6">
            作品集
          </h1>
          <div className="w-24 h-px bg-accent-gold/40 mb-6" />
          <p className="text-sm text-gray-600 tracking-wide mb-1">
            共 <span className="text-accent-gold/60">{rawWorks.length}</span> 部作品
          </p>
          <p className="text-sm text-gray-600 tracking-wide mb-6">
            累计 <span className="text-accent-gold/60">{totalScore.toLocaleString()}</span> 人气
          </p>

          {/* Sort buttons - gallery style */}
          <div className="flex gap-2">
            <button
              onClick={() => setSortMode('heat')}
              className={`text-xs px-3 py-1 border transition-colors ${sortMode === 'heat' ? 'border-accent-gold/60 text-accent-gold' : 'border-dark-600 text-gray-500 hover:border-gray-500'}`}
            >🔥 人气值</button>
            <button
              onClick={() => setSortMode('views')}
              className={`text-xs px-3 py-1 border transition-colors ${sortMode === 'views' ? 'border-accent-gold/60 text-accent-gold' : 'border-dark-600 text-gray-500 hover:border-gray-500'}`}
            >👁 播放量</button>
          </div>
        </motion.div>

        {/* Works Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sorted.map((work, index) => (
            <motion.a
              key={work.id}
              href={work.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.04 }}
              className="group cursor-pointer"
              onClick={() => trackWorkClick(work.id)}
            >
              <div className="relative aspect-video bg-dark-800 border border-dark-700 overflow-hidden mb-3">
                <img
                  src={proxyImageUrl(work.thumbnail)}
                  alt={work.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const parent = target.parentElement!
                    const div = document.createElement('div')
                    div.className = 'w-full h-full flex flex-col items-center justify-center gap-2'
                    const icon = document.createElement('div')
                    icon.className = 'text-3xl text-gray-600'
                    icon.textContent = '🎬'
                    const label = document.createElement('div')
                    label.className = 'text-xs text-gray-600 tracking-wide'
                    label.textContent = work.title
                    div.appendChild(icon)
                    div.appendChild(label)
                    parent.appendChild(div)
                  }}
                />
                {/* Top-left: Heat */}
                <div className="absolute top-2 left-2 bg-accent-gold/90 text-dark-900 text-xs font-medium px-2 py-0.5">
                  🔥 {(work.score || 0).toLocaleString()}
                </div>
                {/* Top-right: Duration */}
                <div className="absolute top-2 right-2 bg-black/70 text-xs text-gray-400 px-2 py-0.5">
                  {formatDuration(work.duration)}
                </div>
                {/* Bottom-left: Views */}
                <div className="absolute bottom-2 left-2 bg-black/70 text-xs text-gray-400 px-2 py-0.5">
                  👁 {work.views.toLocaleString()} 播放
                </div>
                {/* Center: Play on hover */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-4xl">▶</span>
                </div>
              </div>
              <h3 className="text-base mb-1 group-hover:text-accent-gold/80 transition-colors leading-snug">
                {work.title}
              </h3>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="truncate mr-2">{work.categories || work.author}</span>
                <span className="text-accent-gold/50 shrink-0">🔥 {(work.score || 0).toLocaleString()}</span>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </div>
  )
}
