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
import stash169Raw from '@/data/stash169.json'
import stash168Raw from '@/data/stash168.json'
import stash167Raw from '@/data/stash167.json'
import stash166Raw from '@/data/stash166.json'
import stash165Raw from '@/data/stash165.json'
import stash164Raw from '@/data/stash164.json'
import stash163Raw from '@/data/stash163.json'
import stash162Raw from '@/data/stash162.json'
import stash161Raw from '@/data/stash161.json'
import stash160Raw from '@/data/stash160.json'

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
const stash169Data: StashWork[] = stash169Raw.map(transform).sort(sortByHeat)
const stash168Data: StashWork[] = stash168Raw.map(transform).sort(sortByHeat)
const stash167Data: StashWork[] = stash167Raw.map(transform).sort(sortByHeat)
const stash166Data: StashWork[] = stash166Raw.map(transform).sort(sortByHeat)
const stash165Data: StashWork[] = stash165Raw.map(transform).sort(sortByHeat)
const stash164Data: StashWork[] = stash164Raw.map(transform).sort(sortByHeat)
const stash163Data: StashWork[] = stash163Raw.map(transform).sort(sortByHeat)
const stash162Data: StashWork[] = stash162Raw.map(transform).sort(sortByHeat)
const stash161Data: StashWork[] = stash161Raw.map(transform).sort(sortByHeat)
const stash160Data: StashWork[] = stash160Raw.map(transform).sort(sortByHeat)

const allStashes = [
  { id: '176', label: 'Stash 176', data: stash176Data },
  { id: '175', label: 'Stash 175', data: stash175Data },
  { id: '174', label: 'Stash 174', data: stash174Data },
  { id: '173', label: 'Stash 173', data: stash173Data },
  { id: '172', label: 'Stash 172', data: stash172Data },
  { id: '171', label: 'Stash 171', data: stash171Data },
  { id: '170', label: 'Stash 170', data: stash170Data },
  { id: '169', label: 'Stash 169', data: stash169Data },
  { id: '168', label: 'Stash 168', data: stash168Data },
  { id: '167', label: 'Stash 167', data: stash167Data },
  { id: '166', label: 'Stash 166', data: stash166Data },
  { id: '165', label: 'Stash 165', data: stash165Data },
  { id: '164', label: 'Stash 164', data: stash164Data },
  { id: '163', label: 'Stash 163', data: stash163Data },
  { id: '162', label: 'Stash 162', data: stash162Data },
  { id: '161', label: 'Stash 161', data: stash161Data },
  { id: '160', label: 'Stash 160', data: stash160Data },
]

const totalWorks = allStashes.reduce((s, st) => s + st.data.length, 0)

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
              {allStashes.length} 个收藏集 · 共 <span className="text-accent-gold/60">{totalWorks.toString()}</span> 部作品
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
            {allStashes.map(st => (
              <TabBtn key={st.id} label={st.label} count={st.data.length} active={activeTab===st.id} onClick={()=>setActiveTab(st.id)} />
            ))}
          </div>

          {/* Tab Content */}
          {allStashes.map(st => activeTab === st.id && (
            <StashSection key={st.id} works={st.data} label={st.label} totalViews={0} />
          ))}
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
