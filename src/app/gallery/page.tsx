'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { trackWorkClick } from '@/lib/points'
import stash176Raw from '@/data/stash-works.json'
import stash175Raw from '@/data/stash175.json'
import stash174Raw from '@/data/stash174.json'
import stash173Raw from '@/data/stash173.json'
import stash172Raw from '@/data/stash172.json'
import stash171Raw from '@/data/stash171.json'
import stash170Raw from '@/data/stash170.json'

interface StashWork {
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
  author: string
}

function transform(w: any): StashWork {
  return {
    id: w.id.toString(),
    title: w.title,
    videoUrl: w.web_url,
    thumbnail: w.cover,
    duration: w.duration,
    categories: w.categories,
    views: w.count_view,
    likes: w.count_like,
    collects: w.count_collect,
    heat: w.count_view + w.count_like * 5 + w.count_collect * 10,
    author: w.author || '未知',
  }
}

function sortByHeat(a: StashWork, b: StashWork) { return (b.heat || 0) - (a.heat || 0) }
function sortByViews(a: StashWork, b: StashWork) { return (b.views || 0) - (a.views || 0) }

const stash176Data: StashWork[] = stash176Raw.map(transform).sort(sortByHeat)
const stash175Data: StashWork[] = stash175Raw.map(transform).sort(sortByHeat)
const stash174Data: StashWork[] = stash174Raw.map(transform).sort(sortByHeat)
const stash173Data: StashWork[] = stash173Raw.map(transform).sort(sortByHeat)
const stash172Data: StashWork[] = stash172Raw.map(transform).sort(sortByHeat)
const stash171Data: StashWork[] = stash171Raw.map(transform).sort(sortByHeat)
const stash170Data: StashWork[] = stash170Raw.map(transform).sort(sortByHeat)

function TabBtn({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-5 py-3 text-sm tracking-wide transition-all border-b-2 -mb-px ${
        active ? 'border-accent-gold/60 text-accent-gold' : 'border-transparent text-gray-500 hover:text-gray-300'
      }`}
    >
      {label}
      <span className="ml-2 text-xs opacity-60">{count}</span>
    </button>
  )
}

function StashSection({ works, label, totalViews }: { works: StashWork[]; label: string; totalViews: number }) {
  const [sortMode, setSortMode] = useState<'heat' | 'views'>('heat')
  const [sorted, setSorted] = useState<StashWork[]>(works)

  useEffect(() => {
    setSorted(sortMode === 'heat' ? [...works].sort(sortByHeat) : [...works].sort(sortByViews))
  }, [sortMode, works])

  const totalPlays = works.reduce((s, w) => s + (w.views || 0), 0)

  return (
    <div className="mb-16">
      <div className="flex items-center gap-4 mb-8 flex-wrap">
        <h2 className="font-display text-2xl">{label}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setSortMode('heat')}
            className={`text-xs px-3 py-1 border transition-colors ${sortMode === 'heat' ? 'border-accent-gold/60 text-accent-gold' : 'border-dark-600 text-gray-500 hover:border-gray-500'}`}
          >🔥 热度</button>
          <button
            onClick={() => setSortMode('views')}
            className={`text-xs px-3 py-1 border transition-colors ${sortMode === 'views' ? 'border-accent-gold/60 text-accent-gold' : 'border-dark-600 text-gray-500 hover:border-gray-500'}`}
          >👁 播放量</button>
        </div>
        <div className="hidden sm:block flex-1 h-px bg-dark-700" />
        <span className="text-sm text-gray-500">{works.length} 部作品</span>
        {totalViews !== undefined && (
          <span className="text-xs text-accent-gold/50">🔥 累计 {totalPlays.toLocaleString()}</span>
        )}
      </div>
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
                src={work.thumbnail}
                alt={work.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  target.parentElement!.innerHTML = `<div class="w-full h-full flex flex-col items-center justify-center gap-2"><span class="text-3xl text-dark-600">▶</span><span class="text-xs text-dark-600">${work.title}</span></div>`
                }}
              />
              <div className="absolute top-2 right-2 bg-black/70 text-xs text-gray-400 px-2 py-0.5">
                {formatDuration(work.duration)}
              </div>
              <div className="absolute top-2 left-2 bg-accent-gold/90 text-dark-900 text-xs font-medium px-2 py-0.5">
                🔥 {work.views.toLocaleString()}
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-4xl">▶</span>
              </div>
            </div>
            <h3 className="text-base mb-1 group-hover:text-accent-gold/80 transition-colors leading-snug">
              {work.title}
            </h3>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="truncate mr-2">{work.categories || work.author}</span>
              <span className="text-accent-gold/50 shrink-0">{work.views.toLocaleString()} 播放</span>
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  )
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function GalleryPage() {
  const [activeTab, setActiveTab] = useState('176')

  return (
    <div className="pt-24 pb-32">
      {/* Header */}
      <section className="px-6 md:px-12 lg:px-24 mb-16">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-display text-5xl md:text-6xl font-light mb-6">
              佳片欣赏
            </h1>
            <div className="w-24 h-px bg-accent-gold/40 mb-4" />
            <p className="text-sm text-gray-600 tracking-wide mb-4">
              两个收藏集 · 共 <span className="text-accent-gold/60">{(stash176Data.length + stash175Data.length).toString()}</span> 部作品
            </p>
            <p className="text-xl text-gray-400 max-w-3xl leading-relaxed">
              汇聚优秀创作者的视觉作品，激发无限灵感
            </p>
          </motion.div>
        </div>
      </section>

      {/* Works Grid */}
      <section className="px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto">
          {/* Tab Bar */}
          <div className="flex gap-1 mb-12 border-b border-dark-700 overflow-x-auto">
            <TabBtn label="Stash 176" count={stash176Data.length} active={activeTab==='176'} onClick={()=>setActiveTab('176')} />
            <TabBtn label="Stash 175" count={stash175Data.length} active={activeTab==='175'} onClick={()=>setActiveTab('175')} />
            <TabBtn label="Stash 174" count={stash174Data.length} active={activeTab==='174'} onClick={()=>setActiveTab('174')} />
            <TabBtn label="Stash 173" count={stash173Data.length} active={activeTab==='173'} onClick={()=>setActiveTab('173')} />
            <TabBtn label="Stash 172" count={stash172Data.length} active={activeTab==='172'} onClick={()=>setActiveTab('172')} />
            <TabBtn label="Stash 171" count={stash171Data.length} active={activeTab==='171'} onClick={()=>setActiveTab('171')} />
            <TabBtn label="Stash 170" count={stash170Data.length} active={activeTab==='170'} onClick={()=>setActiveTab('170')} />
          </div>

          {/* Tab Content */}
          {activeTab === '176' && <StashSection key="176" works={stash176Data} label="Stash 176" totalViews={0} />}
          {activeTab === '175' && <StashSection key="175" works={stash175Data} label="Stash 175" totalViews={0} />}
          {activeTab === '174' && <StashSection key="174" works={stash174Data} label="Stash 174" totalViews={0} />}
          {activeTab === '173' && <StashSection key="173" works={stash173Data} label="Stash 173" totalViews={0} />}
          {activeTab === '172' && <StashSection key="172" works={stash172Data} label="Stash 172" totalViews={0} />}
          {activeTab === '171' && <StashSection key="171" works={stash171Data} label="Stash 171" totalViews={0} />}
          {activeTab === '170' && <StashSection key="170" works={stash170Data} label="Stash 170" totalViews={0} />}
        </div>
      </section>

      {/* Submit CTA */}
      <section className="px-6 md:px-12 lg:px-24 mt-24">
        <div className="max-w-7xl mx-auto">
          <div className="border border-dark-700 p-12 text-center">
            <h3 className="font-display text-2xl mb-4">有优秀作品想展示？</h3>
            <p className="text-gray-500 mb-8">注册账号后上传作品，通过审核即可在佳片欣赏页面展示</p>
            <a
              href="/register"
              className="inline-block bg-accent-gold/20 border border-accent-gold/40 text-accent-gold px-8 py-4 text-sm tracking-widest uppercase hover:bg-accent-gold/30 transition-all"
            >
              立即注册
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
