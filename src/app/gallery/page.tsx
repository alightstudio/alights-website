'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { trackWorkClick } from '@/lib/points'
import { proxyImageUrl } from '@/lib/proxy-image'
import stash177Raw from '@/data/stash177.json'
import stash176Raw from '@/data/stash176.json'
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
import stash159Raw from '@/data/stash159.json'
import stash158Raw from '@/data/stash158.json'
import stash157Raw from '@/data/stash157.json'
import stash156Raw from '@/data/stash156.json'
import stash155Raw from '@/data/stash155.json'
import stash154Raw from '@/data/stash154.json'
import stash153Raw from '@/data/stash153.json'
import stash152Raw from '@/data/stash152.json'
import stash151Raw from '@/data/stash151.json'
import stash149Raw from '@/data/stash149.json'
import stash148Raw from '@/data/stash148.json'
import stash147Raw from '@/data/stash147.json'
import stash146Raw from '@/data/stash146.json'
import stash145Raw from '@/data/stash145.json'
import stash150Raw from '@/data/stash150.json'
import stash160Raw from '@/data/stash160.json'
import stash144Raw from '@/data/stash144.json'
import stash143Raw from '@/data/stash143.json'
import stash142Raw from '@/data/stash142.json'
import stash141Raw from '@/data/stash141.json'
import stash140Raw from '@/data/stash140.json'
import stash139Raw from '@/data/stash139.json'
import stash138Raw from '@/data/stash138.json'
import stash137Raw from '@/data/stash137.json'
import stash136Raw from '@/data/stash136.json'
import stash135Raw from '@/data/stash135.json'
import stash134Raw from '@/data/stash134.json'
import stash133Raw from '@/data/stash133.json'
import stash132Raw from '@/data/stash132.json'
import stash131Raw from '@/data/stash131.json'
import stash130Raw from '@/data/stash130.json'
import stash123Raw from '@/data/stash123.json'
import stash122Raw from '@/data/stash122.json'
import stash121Raw from '@/data/stash121.json'
import stash120Raw from '@/data/stash120.json'
import stash119Raw from '@/data/stash119.json'
import stash118Raw from '@/data/stash118.json'
import stash117Raw from '@/data/stash117.json'
import stash116Raw from '@/data/stash116.json'
import stash115Raw from '@/data/stash115.json'
import stash114Raw from '@/data/stash114.json'
import stash113Raw from '@/data/stash113.json'
import stash112Raw from '@/data/stash112.json'
import stash111Raw from '@/data/stash111.json'
import stash110Raw from '@/data/stash110.json'
import stash109Raw from '@/data/stash109.json'
import stash108Raw from '@/data/stash108.json'
import stash107Raw from '@/data/stash107.json'
import stash106Raw from '@/data/stash106.json'
import stash105Raw from '@/data/stash105.json'
import stash104Raw from '@/data/stash104.json'
import stash103Raw from '@/data/stash103.json'
import stash102Raw from '@/data/stash102.json'
import stash101Raw from '@/data/stash101.json'
import stash100Raw from '@/data/stash100.json'
import stash99Raw from '@/data/stash99.json'
import stash98Raw from '@/data/stash98.json'
import stash97Raw from '@/data/stash97.json'
import stash96Raw from '@/data/stash96.json'
import stash95Raw from '@/data/stash95.json'
import stash94Raw from '@/data/stash94.json'
import stash93Raw from '@/data/stash93.json'
import stash92Raw from '@/data/stash92.json'
import stash91Raw from '@/data/stash91.json'
import stash90Raw from '@/data/stash90.json'
import stash129Raw from '@/data/stash129.json'
import stash128Raw from '@/data/stash128.json'
import stash127Raw from '@/data/stash127.json'
import stash126Raw from '@/data/stash126.json'
import stash125Raw from '@/data/stash125.json'
import stash124Raw from '@/data/stash124.json'

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
  score: number
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
    heat: w.count_score ?? (w.count_view + w.count_like * 5 + w.count_collect * 10),
    score: w.count_score ?? 0,
    author: w.author || '未知',
  }
}

function sortByHeat(a: StashWork, b: StashWork) { return (b.score || b.heat || 0) - (a.score || a.heat || 0) }
function sortByViews(a: StashWork, b: StashWork) { return (b.views || 0) - (a.views || 0) }

const stash177Data: StashWork[] = stash177Raw.map(transform).sort(sortByHeat)
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
const stash159Data: StashWork[] = stash159Raw.map(transform).sort(sortByHeat)
const stash158Data: StashWork[] = stash158Raw.map(transform).sort(sortByHeat)
const stash157Data: StashWork[] = stash157Raw.map(transform).sort(sortByHeat)
const stash156Data: StashWork[] = stash156Raw.map(transform).sort(sortByHeat)
const stash155Data: StashWork[] = stash155Raw.map(transform).sort(sortByHeat)
const stash154Data: StashWork[] = stash154Raw.map(transform).sort(sortByHeat)
const stash153Data: StashWork[] = stash153Raw.map(transform).sort(sortByHeat)
const stash152Data: StashWork[] = stash152Raw.map(transform).sort(sortByHeat)
const stash151Data: StashWork[] = stash151Raw.map(transform).sort(sortByHeat)
const stash150Data: StashWork[] = stash150Raw.map(transform).sort(sortByHeat)
const stash149Data: StashWork[] = stash149Raw.map(transform).sort(sortByHeat)
const stash148Data: StashWork[] = stash148Raw.map(transform).sort(sortByHeat)
const stash147Data: StashWork[] = stash147Raw.map(transform).sort(sortByHeat)
const stash146Data: StashWork[] = stash146Raw.map(transform).sort(sortByHeat)
const stash145Data: StashWork[] = stash145Raw.map(transform).sort(sortByHeat)
const stash144Data: StashWork[] = stash144Raw.map(transform).sort(sortByHeat)
const stash143Data: StashWork[] = stash143Raw.map(transform).sort(sortByHeat)
const stash142Data: StashWork[] = stash142Raw.map(transform).sort(sortByHeat)
const stash141Data: StashWork[] = stash141Raw.map(transform).sort(sortByHeat)
const stash140Data: StashWork[] = stash140Raw.map(transform).sort(sortByHeat)
const stash139Data: StashWork[] = stash139Raw.map(transform).sort(sortByHeat)
const stash138Data: StashWork[] = stash138Raw.map(transform).sort(sortByHeat)
const stash137Data: StashWork[] = stash137Raw.map(transform).sort(sortByHeat)
const stash136Data: StashWork[] = stash136Raw.map(transform).sort(sortByHeat)
const stash135Data: StashWork[] = stash135Raw.map(transform).sort(sortByHeat)
const stash134Data: StashWork[] = stash134Raw.map(transform).sort(sortByHeat)
const stash133Data: StashWork[] = stash133Raw.map(transform).sort(sortByHeat)
const stash132Data: StashWork[] = stash132Raw.map(transform).sort(sortByHeat)
const stash131Data: StashWork[] = stash131Raw.map(transform).sort(sortByHeat)
const stash130Data: StashWork[] = stash130Raw.map(transform).sort(sortByHeat)
const stash129Data: StashWork[] = stash129Raw.map(transform).sort(sortByHeat)
const stash128Data: StashWork[] = stash128Raw.map(transform).sort(sortByHeat)
const stash127Data: StashWork[] = stash127Raw.map(transform).sort(sortByHeat)
const stash126Data: StashWork[] = stash126Raw.map(transform).sort(sortByHeat)
const stash125Data: StashWork[] = stash125Raw.map(transform).sort(sortByHeat)
const stash124Data: StashWork[] = stash124Raw.map(transform).sort(sortByHeat)
const stash123Data: StashWork[] = stash123Raw.map(transform).sort(sortByHeat)
const stash122Data: StashWork[] = stash122Raw.map(transform).sort(sortByHeat)
const stash121Data: StashWork[] = stash121Raw.map(transform).sort(sortByHeat)
const stash120Data: StashWork[] = stash120Raw.map(transform).sort(sortByHeat)
const stash119Data: StashWork[] = stash119Raw.map(transform).sort(sortByHeat)
const stash118Data: StashWork[] = stash118Raw.map(transform).sort(sortByHeat)
const stash117Data: StashWork[] = stash117Raw.map(transform).sort(sortByHeat)
const stash116Data: StashWork[] = stash116Raw.map(transform).sort(sortByHeat)
const stash115Data: StashWork[] = stash115Raw.map(transform).sort(sortByHeat)
const stash114Data: StashWork[] = stash114Raw.map(transform).sort(sortByHeat)
const stash113Data: StashWork[] = stash113Raw.map(transform).sort(sortByHeat)
const stash112Data: StashWork[] = stash112Raw.map(transform).sort(sortByHeat)
const stash111Data: StashWork[] = stash111Raw.map(transform).sort(sortByHeat)
const stash110Data: StashWork[] = stash110Raw.map(transform).sort(sortByHeat)
const stash109Data: StashWork[] = stash109Raw.map(transform).sort(sortByHeat)
const stash108Data: StashWork[] = stash108Raw.map(transform).sort(sortByHeat)
const stash107Data: StashWork[] = stash107Raw.map(transform).sort(sortByHeat)
const stash106Data: StashWork[] = stash106Raw.map(transform).sort(sortByHeat)
const stash105Data: StashWork[] = stash105Raw.map(transform).sort(sortByHeat)
const stash104Data: StashWork[] = stash104Raw.map(transform).sort(sortByHeat)
const stash103Data: StashWork[] = stash103Raw.map(transform).sort(sortByHeat)
const stash102Data: StashWork[] = stash102Raw.map(transform).sort(sortByHeat)
const stash101Data: StashWork[] = stash101Raw.map(transform).sort(sortByHeat)
const stash100Data: StashWork[] = stash100Raw.map(transform).sort(sortByHeat)
const stash99Data: StashWork[] = stash99Raw.map(transform).sort(sortByHeat)
const stash98Data: StashWork[] = stash98Raw.map(transform).sort(sortByHeat)
const stash97Data: StashWork[] = stash97Raw.map(transform).sort(sortByHeat)
const stash96Data: StashWork[] = stash96Raw.map(transform).sort(sortByHeat)
const stash95Data: StashWork[] = stash95Raw.map(transform).sort(sortByHeat)
const stash94Data: StashWork[] = stash94Raw.map(transform).sort(sortByHeat)
const stash93Data: StashWork[] = stash93Raw.map(transform).sort(sortByHeat)
const stash92Data: StashWork[] = stash92Raw.map(transform).sort(sortByHeat)
const stash91Data: StashWork[] = stash91Raw.map(transform).sort(sortByHeat)
const stash90Data: StashWork[] = stash90Raw.map(transform).sort(sortByHeat)

const allStashes = [
  { id: '177', label: 'Stash 177', data: stash177Data },
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
  { id: '159', label: 'Stash 159', data: stash159Data },
  { id: '158', label: 'Stash 158', data: stash158Data },
  { id: '157', label: 'Stash 157', data: stash157Data },
  { id: '156', label: 'Stash 156', data: stash156Data },
  { id: '155', label: 'Stash 155', data: stash155Data },
  { id: '154', label: 'Stash 154', data: stash154Data },
  { id: '153', label: 'Stash 153', data: stash153Data },
  { id: '152', label: 'Stash 152', data: stash152Data },
  { id: '151', label: 'Stash 151', data: stash151Data },
  { id: '150', label: 'Stash 150', data: stash150Data },
  { id: '149', label: 'Stash 149', data: stash149Data },
  { id: '148', label: 'Stash 148', data: stash148Data },
  { id: '147', label: 'Stash 147', data: stash147Data },
  { id: '146', label: 'Stash 146', data: stash146Data },
  { id: '145', label: 'Stash 145', data: stash145Data },
  { id: '144', label: 'Stash 144', data: stash144Data },
  { id: '143', label: 'Stash 143', data: stash143Data },
  { id: '142', label: 'Stash 142', data: stash142Data },
  { id: '141', label: 'Stash 141', data: stash141Data },
  { id: '140', label: 'Stash 140', data: stash140Data },
  { id: '139', label: 'Stash 139', data: stash139Data },
  { id: '138', label: 'Stash 138', data: stash138Data },
  { id: '137', label: 'Stash 137', data: stash137Data },
  { id: '136', label: 'Stash 136', data: stash136Data },
  { id: '135', label: 'Stash 135', data: stash135Data },
  { id: '134', label: 'Stash 134', data: stash134Data },
  { id: '133', label: 'Stash 133', data: stash133Data },
  { id: '132', label: 'Stash 132', data: stash132Data },
  { id: '131', label: 'Stash 131', data: stash131Data },
  { id: '130', label: 'Stash 130', data: stash130Data },
  { id: '129', label: 'Stash 129', data: stash129Data },
  { id: '128', label: 'Stash 128', data: stash128Data },
  { id: '127', label: 'Stash 127', data: stash127Data },
  { id: '126', label: 'Stash 126', data: stash126Data },
  { id: '125', label: 'Stash 125', data: stash125Data },
  { id: '124', label: 'Stash 124', data: stash124Data },
  { id: '123', label: 'Stash 123', data: stash123Data },
  { id: '122', label: 'Stash 122', data: stash122Data },
  { id: '121', label: 'Stash 121', data: stash121Data },
  { id: '120', label: 'Stash 120', data: stash120Data },
  { id: '119', label: 'Stash 119', data: stash119Data },
  { id: '118', label: 'Stash 118', data: stash118Data },
  { id: '117', label: 'Stash 117', data: stash117Data },
  { id: '116', label: 'Stash 116', data: stash116Data },
  { id: '115', label: 'Stash 115', data: stash115Data },
  { id: '114', label: 'Stash 114', data: stash114Data },
  { id: '113', label: 'Stash 113', data: stash113Data },
  { id: '112', label: 'Stash 112', data: stash112Data },
  { id: '111', label: 'Stash 111', data: stash111Data },
  { id: '110', label: 'Stash 110', data: stash110Data },
  { id: '109', label: 'Stash 109', data: stash109Data },
  { id: '108', label: 'Stash 108', data: stash108Data },
  { id: '107', label: 'Stash 107', data: stash107Data },
  { id: '106', label: 'Stash 106', data: stash106Data },
  { id: '105', label: 'Stash 105', data: stash105Data },
  { id: '104', label: 'Stash 104', data: stash104Data },
  { id: '103', label: 'Stash 103', data: stash103Data },
  { id: '102', label: 'Stash 102', data: stash102Data },
  { id: '101', label: 'Stash 101', data: stash101Data },
  { id: '100', label: 'Stash 100', data: stash100Data },
  { id: '99', label: 'Stash 99', data: stash99Data },
  { id: '98', label: 'Stash 98', data: stash98Data },
  { id: '97', label: 'Stash 97', data: stash97Data },
  { id: '96', label: 'Stash 96', data: stash96Data },
  { id: '95', label: 'Stash 95', data: stash95Data },
  { id: '94', label: 'Stash 94', data: stash94Data },
  { id: '93', label: 'Stash 93', data: stash93Data },
  { id: '92', label: 'Stash 92', data: stash92Data },
  { id: '91', label: 'Stash 91', data: stash91Data },
  { id: '90', label: 'Stash 90', data: stash90Data },
]

const totalWorks = allStashes.reduce((s, st) => s + st.data.length, 0)
const totalHeatAll = allStashes.reduce((s, st) => s + st.data.reduce((ss, w) => ss + (w.score ?? 0), 0), 0)

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
  const router = useRouter()
  const [sortMode, setSortMode] = useState<'heat' | 'views'>('heat')
  const [sorted, setSorted] = useState<StashWork[]>(works)

  useEffect(() => {
    setSorted(sortMode === 'heat' ? [...works].sort(sortByHeat) : [...works].sort(sortByViews))
  }, [sortMode, works])

  const totalPlays = works.reduce((s, w) => s + (w.views || 0), 0)
  const totalScore = works.reduce((s, w) => s + (w.score ?? 0), 0)

  return (
    <div className="mb-16">
      <div className="flex items-center gap-4 mb-8 flex-wrap">
        <h2 className="font-display text-2xl">{label}</h2>
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
        <div className="hidden sm:block flex-1 h-px bg-dark-700" />
        <span className="text-sm text-gray-500">{works.length} 部作品</span>
        {totalViews !== undefined && (
          <span className="text-xs text-accent-gold/50">🔥 累计 {totalScore.toLocaleString()} 人气</span>
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
            onClick={(e) => {
              if (!localStorage.getItem('userId')) {
                e.preventDefault()
                router.push('/login?redirect=/gallery')
                return
              }
              trackWorkClick(work.id)
            }}
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
                  const icon = document.createElement('span')
                  icon.className = 'text-3xl text-dark-600'
                  icon.textContent = '▶'
                  const label = document.createElement('span')
                  label.className = 'text-xs text-dark-600'
                  label.textContent = work.title
                  div.appendChild(icon)
                  div.appendChild(label)
                  parent.appendChild(div)
                }}
              />
              <div className="absolute top-2 left-2 bg-accent-gold/90 text-dark-900 text-xs font-medium px-2 py-0.5">
                🔥 {(work.score || 0).toLocaleString()}
              </div>
              <div className="absolute top-2 right-2 bg-black/70 text-xs text-gray-400 px-2 py-0.5">
                {formatDuration(work.duration)}
              </div>
              <div className="absolute bottom-2 left-2 bg-black/70 text-xs text-gray-400 px-2 py-0.5">
                👁 {work.views.toLocaleString()} 播放
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
              <span className="text-accent-gold/50 shrink-0">🔥 {(work.score || 0).toLocaleString()}</span>
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
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('177')
  const [searchTerm, setSearchTerm] = useState('')

  const allWorksFlat = useMemo(() => allStashes.flatMap(st => st.data), [])

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return []
    const term = searchTerm.toLowerCase().trim()
    return allWorksFlat.filter(w => w.title.toLowerCase().includes(term))
  }, [searchTerm])

  // 按年代分组
  const stashGroups = [
    { label: '最新收藏 (170-177)', stashes: allStashes.filter(s => parseInt(s.id) >= 170) },
    { label: '中期收藏 (160-169)', stashes: allStashes.filter(s => parseInt(s.id) >= 160 && parseInt(s.id) < 170) },
    { label: '早期收藏 (150-159)', stashes: allStashes.filter(s => parseInt(s.id) >= 150 && parseInt(s.id) < 160) },
    { label: '更早收藏 (140-149)', stashes: allStashes.filter(s => parseInt(s.id) >= 140 && parseInt(s.id) < 150) },
    { label: '经典收藏 (90-139)', stashes: allStashes.filter(s => parseInt(s.id) >= 90 && parseInt(s.id) < 140) },
  ]

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
              创意灵感
            </h1>
            <div className="w-24 h-px bg-accent-gold/40 mb-4" />
            <p className="text-sm text-gray-600 tracking-wide mb-1">
              {allStashes.length} 个收藏集 · 共 <span className="text-accent-gold/60">{totalWorks.toLocaleString()}</span> 部作品
            </p>
            <p className="text-sm text-gray-600 tracking-wide mb-4">
              累计 <span className="text-accent-gold/60">{totalHeatAll.toLocaleString()}</span> 人气
            </p>
            <p className="text-lg text-gray-400 max-w-3xl leading-relaxed">
              汇聚优秀创作者的视觉作品，激发无限灵感
            </p>
            <p className="text-sm text-gray-500 max-w-3xl leading-relaxed mt-1">
              Curated visual inspiration from outstanding creators
            </p>
          </motion.div>
        </div>
      </section>

      {/* Works Grid */}
      <section className="px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto">
          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-8"
          >
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="搜索作品标题..."
                className="w-full bg-dark-800 border border-dark-600 text-gray-300 placeholder-gray-600 px-12 py-3.5 text-sm tracking-wide focus:outline-none focus:border-accent-gold/40 transition-colors"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">🔍</span>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-sm"
                >✕</button>
              )}
            </div>
          </motion.div>

          {/* Search Results or Tab Bar */}
          {searchTerm.trim() ? (
            <StashSection
              works={searchResults}
              label={`搜索 "${searchTerm.trim()}"`}
              totalViews={0}
            />
          ) : (
            <>
              {/* Tab Bar */}
              <div className="flex gap-1 mb-12 border-b border-dark-700 overflow-x-auto scrollbar-none">
                {allStashes.map(st => (
                  <TabBtn key={st.id} label={st.label} count={st.data.length} active={activeTab===st.id} onClick={()=>setActiveTab(st.id)} />
                ))}
              </div>

              {/* Tab Content */}
              {allStashes.map(st => activeTab === st.id && (
                <StashSection key={st.id} works={st.data} label={st.label} totalViews={0} />
              ))}
            </>
          )}
        </div>
      </section>

      {/* Submit CTA */}
      <section className="px-6 md:px-12 lg:px-24 mt-24">
        <div className="max-w-7xl mx-auto">
          <div className="border border-dark-700 p-12 text-center">
            <h3 className="font-display text-2xl mb-4">有优秀作品想展示？</h3>
            <p className="text-gray-500 mb-8">注册账号后上传作品，通过审核即可在创意灵感页面展示</p>
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
