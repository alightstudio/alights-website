'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { trackWorkClick } from '@/lib/points'

interface FeaturedWork {
  id: string
  title: string
  titleEn: string
  category: string
  categoryEn: string
  image: string
  coverUrl?: string
  homepageOrder: number | null
  videoUrl?: string
  views?: number
  duration?: number
}

// 当数据库不可用时的静态作品数据（fallback）
const DEFAULT_WORKS: FeaturedWork[] = [
  { id: 'demo-1', title: '灯语', titleEn: 'DENGYU LIST', category: 'TVC广告', categoryEn: 'TVC COMMERCIAL', image: 'https://us-xpc5.xpccdn.com/b9c708b9-6207-41ce-a59a-b9d6ee88ae7b/c9de12f5-c71f-4aeb-bad9-f67154f88084.jpg', homepageOrder: 1, views: 0 },
  { id: 'demo-2', title: '想象', titleEn: 'Xiangxiang LIST', category: 'TVC广告', categoryEn: 'TVC COMMERCIAL', image: 'https://us-xpc5.xpccdn.com/2c1ed4da-92ea-4c0e-9d40-58d1c09b3c5c/6db3c289-f6c1-440d-bc1e-c83671cae8d8.jpg', homepageOrder: 2, views: 0 },
  { id: 'demo-3', title: '稳座', titleEn: 'Wenzuo LIST', category: 'TVC广告', categoryEn: 'TVC COMMERCIAL', image: 'https://us-xpc5.xpccdn.com/4448bed8-579a-4bb2-9b6d-d8defbabd26a/edc0041e-f0e9-4f07-9623-517d7301aba7.jpg', homepageOrder: 3, views: 0 },
  { id: 'demo-4', title: '费翔 X D19', titleEn: 'LEAPMOTOR D19', category: 'TVC广告', categoryEn: 'TVC COMMERCIAL', image: 'https://oss-xpc0.xpccdn.com/uploadfile/article/2025/12/29/e4c586d43e41944b1d8b58476da7549c', homepageOrder: 4, views: 0 },
  { id: 'demo-5', title: '张天爱 | 雅娜薇图', titleEn: 'ZHANG TIANAI', category: 'TVC广告', categoryEn: 'TVC COMMERCIAL', image: 'https://oss-xpc0.xpccdn.com/uploadfile/article/2025/12/11/03e3d4b574519e1720d84581c1d2e331', homepageOrder: 5, views: 0 },
]

export default function WorksPage() {
  const [allWorks, setAllWorks] = useState<FeaturedWork[]>([])
  const [activeCategory, setActiveCategory] = useState('全部')
  const [categories, setCategories] = useState<string[]>(['全部'])
  const [loading, setLoading] = useState(true)
  const [totalViews, setTotalViews] = useState(0)

  useEffect(() => {
    fetch('/api/works')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          console.error('Failed to load works:', data.error)
          setAllWorks(DEFAULT_WORKS)
          setCategories(['全部'])
          return
        }
        if (Array.isArray(data) && data.length > 0) {
          const works = data
          setAllWorks(works)
          const total = works.reduce((sum: number, w: FeaturedWork) => sum + (w.views || 0), 0)
          setTotalViews(total)
          const cats = Array.from(new Set(works.map((w: FeaturedWork) => w.category))) as string[]
          setCategories(['全部', ...cats])
        }
      })
      .catch(err => {
        console.error('Failed to load works:', err)
        setAllWorks(DEFAULT_WORKS)
        const cats = Array.from(new Set(DEFAULT_WORKS.map((w: FeaturedWork) => w.category))) as string[]
        setCategories(['全部', ...cats])
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredWorks = activeCategory === '全部'
    ? allWorks
    : allWorks.filter(work => (work as any).category === activeCategory)

  if (loading) {
    return (
      <div className="pt-24 pb-32 px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="text-center mb-20 space-y-4 animate-pulse">
            <div className="h-14 w-32 bg-white/5 rounded mx-auto" />
            <div className="w-24 h-px bg-white/5 mx-auto" />
          </div>
          {/* Filter skeleton */}
          <div className="flex justify-center gap-4 mb-16 animate-pulse">
            {[1,2,3,4].map(i => <div key={i} className="h-4 w-16 bg-white/5 rounded" />)}
          </div>
          {/* Grid skeleton */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-video bg-white/5 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!loading && allWorks.length === 0) {
    return (
      <div className="pt-24 pb-32 px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="font-display text-5xl md:text-6xl font-light mb-6">作品集</h1>
          <div className="w-24 h-px bg-accent-gold/40 mx-auto mb-8" />
          <p className="text-gray-500 py-20 border border-dark-700">暂无作品</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-24 pb-32 px-6 md:px-12 lg:px-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <h1 className="font-display text-5xl md:text-6xl font-light mb-6">
            作品集
          </h1>
          <div className="w-24 h-px bg-accent-gold/40 mx-auto mb-4" />
          {totalViews > 0 && (
            <p className="text-xs text-gray-600 tracking-wide">
              热度累计 <span className="text-accent-gold/60">{totalViews.toLocaleString()}</span>
            </p>
          )}
        </motion.div>

        {/* Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-4 mb-16"
        >
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-2 text-sm tracking-wide transition-all ${
                activeCategory === category
                  ? 'text-accent-gold border-b border-accent-gold'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              {category}
            </button>
          ))}
        </motion.div>

        {/* Works Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredWorks.map((work, index) => (
            <motion.div
              key={work.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.04 }}
              className="group relative aspect-video bg-dark-700 overflow-hidden cursor-pointer"
              onClick={() => { trackWorkClick(work.id); (work as any).videoUrl && window.open((work as any).videoUrl, '_blank') }}
            >
              {/* Thumbnail */}
              <img
                src={(work as any).image || (work as any).coverUrl || ''}
                alt={(work as any).title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const parent = target.parentElement
                  if (parent) {
                    const placeholder = document.createElement('div')
                    placeholder.className = 'absolute inset-0 flex items-center justify-center'
                    placeholder.innerHTML = '<span class="text-gray-600 text-sm tracking-wide">作品预览</span>'
                    parent.appendChild(placeholder)
                  }
                }}
              />

              {/* Views Badge (top left) */}
              {(work as any).views && (work as any).views > 0 && (
                <div className="absolute top-3 left-3 bg-accent-gold/90 text-dark-900 text-xs font-medium px-2 py-0.5 z-10">
                  🔥 {(work as any).views.toLocaleString()}
                </div>
              )}

              {/* Meta Badges (top right) */}
              <div className="absolute top-3 right-3 flex gap-1.5">
                {work.duration && (
                  <span className="bg-black/60 text-gray-300 text-xs px-2 py-0.5">
                    {Math.floor(work.duration / 60)}:{String(work.duration % 60).padStart(2, '0')}
                  </span>
                )}
                <span className="bg-black/60 text-gray-300 text-xs px-2 py-0.5">
                  {(work as any).category}
                </span>
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-dark-900/90 via-dark-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Info */}
              <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                <h3 className="text-lg font-light mb-1 leading-snug">{(work as any).title}</h3>
                {(work as any).views != null && (
                  <p className="text-xs text-accent-gold/60">🔥 {(work as any).views.toLocaleString()} 次播放</p>
                )}
              </div>

              {/* Play Button */}
              {(work as any).videoUrl && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="w-16 h-16 rounded-full border border-white/30 flex items-center justify-center">
                    <div className="w-0 h-0 border-l-[10px] border-l-white border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-1" />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {filteredWorks.length === 0 && (
          <div className="text-center py-20 border border-dark-700">
            <p className="text-gray-500">该分类暂无作品</p>
          </div>
        )}
      </div>
    </div>
  )
}
