'use client'
import { COMPANY_NAME } from '@/lib/site-constants'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'

const ParticleBackground = dynamic(() => import('@/components/ParticleBackground'), { ssr: false })

const VALUE_DEFAULTS = [
  { title: '极简主义', desc: '减到不能减的设计哲学，让每一帧都充满力量' },
  { title: '追求卓越', desc: '不满足于优秀，始终向着完美迈进' },
  { title: '光影叙事', desc: '用光与影的交织，讲述触动人心的故事' },
]

const SERVICE_DEFAULTS = [
  { title: 'TVC广告', desc: '高端商业广告制作，为品牌打造令人难忘的视觉体验' },
  { title: '产品动画', desc: '三维产品可视化，展现产品的每一个精彩细节' },
  { title: '发布会大屏', desc: '沉浸式视觉体验，让发布会成为难忘的盛会' },
  { title: '影视剧', desc: '电影级特效制作，为故事增添无限可能' },
]

const STORY_TEXT = [
  `${COMPANY_NAME}，专注于高端视效制作领域。我们相信，每一个品牌都有属于自己的独特光芒。`,
  '从 TVC 广告到产品动画，从发布会大屏到影视剧特效，我们用光影艺术，为客户打造令人难忘的视觉体验。',
  '我们追求极致的视觉品质，注重每一个细节的打磨。减到不能减，精到不能精——这是我们的设计哲学。',
]

interface SiteData {
  company?: { name: string; slogan: string; description: string }
  services?: { title: string; desc: string }[]
  particle?: any
}

export default function AboutPage() {
  const [config, setConfig] = useState<SiteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/site')
      .then(res => res.ok ? res.json() : null)
      .then(data => { setConfig(data); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="pt-24 pb-32">
      {/* Hero skeleton */}
      <section className="px-6 md:px-12 lg:px-24 mb-32">
        <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
          <div className="h-14 w-48 bg-white/5 rounded" />
          <div className="w-24 h-px bg-white/5" />
          <div className="h-6 w-96 bg-white/5 rounded" />
        </div>
      </section>
      <section className="px-6 md:px-12 lg:px-24 mb-32">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 animate-pulse">
          <div className="space-y-4">
            <div className="h-10 w-40 bg-white/5 rounded" />
            {[...Array(3)].map((_, i) => <div key={i} className="h-5 w-full bg-white/5 rounded" />)}
          </div>
          <div className="aspect-video bg-white/5 rounded" />
        </div>
      </section>
      <section className="px-6 md:px-12 lg:px-24 mb-32 py-32 animate-pulse" style={{ backgroundColor: 'rgba(18,18,18,0.4)' }}>
        <div className="max-w-7xl mx-auto text-center space-y-6">
          <div className="h-10 w-32 bg-white/5 rounded mx-auto" />
          <div className="w-24 h-px bg-white/5 mx-auto" />
          <div className="grid md:grid-cols-3 gap-12 mt-16">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white/5 rounded" />)}
          </div>
        </div>
      </section>
    </div>
  )

  if (error) return (
    <div className="pt-32 pb-32 text-center">
      <p className="text-gray-500">加载失败，请刷新页面重试</p>
    </div>
  )

  const company = config?.company
  const aboutTitle = company?.name ? `关于${company.name}` : '关于栖光'
  const tagline = company?.slogan || '以光影为笔，以创意为墨，为品牌讲述动人故事'
  const services = config?.services?.length ? config.services : SERVICE_DEFAULTS
  const aboutDesc = company?.description || ''

  return (
    <>
      {/* Fixed full-viewport particle background */}
      {config?.particle && (
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <ParticleBackground config={config.particle} />
        </div>
      )}
      {/* Content with semi-transparent backdrop for readability */}
      <div className="relative z-10 pt-24 pb-32" style={{ backgroundColor: 'rgba(10,10,10,0.55)' }}>
        {/* Hero */}
        <section className="px-6 md:px-12 lg:px-24 mb-32">
          <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-display text-5xl md:text-6xl font-light mb-6">
              {aboutTitle}
            </h1>
            <div className="w-24 h-px bg-accent-gold/40 mb-8" />
            <p className="text-xl text-gray-400 max-w-3xl leading-relaxed">
              {tagline}
            </p>
            {aboutDesc && (
              <p className="text-gray-500 max-w-2xl leading-relaxed mt-6">
                {aboutDesc}
              </p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Story */}
      <section className="px-6 md:px-12 lg:px-24 mb-32">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="font-display text-3xl md:text-4xl font-light mb-8">
                我们的故事
              </h2>
              <div className="space-y-6 text-gray-400 leading-relaxed">
                {STORY_TEXT.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="relative aspect-video bg-dark-700 rounded overflow-hidden"
            >
              <img
                src="/team.jpg"
                alt="栖光团队"
                className="w-full h-full object-cover opacity-80"
                onError={e => {
                  const el = e.target as HTMLImageElement
                  el.style.display = 'none'
                  el.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-600 text-sm">团队照片</div>'
                }}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="px-6 md:px-12 lg:px-24 mb-32 py-32" style={{ backgroundColor: 'rgba(18,18,18,0.4)' }}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="font-display text-3xl md:text-4xl font-light mb-6">
              核心价值
            </h2>
            <div className="w-24 h-px bg-accent-gold/40 mx-auto" />
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12">
            {VALUE_DEFAULTS.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <h3 className="text-xl font-light mb-4 tracking-wide">
                  {value.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {value.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="font-display text-3xl md:text-4xl font-light mb-6">
              服务领域
            </h2>
            <div className="w-24 h-px bg-accent-gold/40 mx-auto" />
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {services.map((svc: { title: string; desc: string }, index: number) => (
              <motion.div
                key={svc.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="p-8 border border-dark-500"
              >
                <h3 className="text-xl font-light mb-3 tracking-wide">
                  {svc.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {svc.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
    </>
  )
}
