'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface Work {
  id: string
  title: string
  description: string
  category: string
  videoUrl: string
  coverUrl: string
  creatorName: string
  creatorPhone: string
}

const categories = ['全部', 'TVC广告', '产品动画', '发布会大屏', '影视剧']

export default function GalleryPage() {
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('全部')

  useEffect(() => {
    fetchWorks()
  }, [activeCategory])

  const fetchWorks = async () => {
    try {
      const url = activeCategory === '全部' 
        ? '/api/gallery' 
        : `/api/gallery?category=${encodeURIComponent(activeCategory)}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setWorks(data)
      }
    } catch (error) {
      console.error('获取作品失败:', error)
    } finally {
      setLoading(false)
    }
  }

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
              作品赏析
            </h1>
            <div className="w-24 h-px bg-accent-gold/40 mb-8" />
            <p className="text-xl text-gray-400 max-w-3xl leading-relaxed">
              汇聚优秀创作者的视觉作品，激发无限灵感
            </p>
          </motion.div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="px-6 md:px-12 lg:px-24 mb-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap gap-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2 text-sm tracking-wide transition-all ${
                  activeCategory === cat
                    ? 'bg-accent-gold/20 text-accent-gold border border-accent-gold/40'
                    : 'border border-dark-700 text-gray-500 hover:border-gray-600 hover:text-gray-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Works Grid */}
      <section className="px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="text-center py-20 text-gray-500">加载中...</div>
          ) : works.length === 0 ? (
            <div className="text-center py-20 border border-dark-700">
              <p className="text-gray-500 mb-4">暂无作品</p>
              <p className="text-sm text-gray-600">成为第一个创作者，提交您的作品吧</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {works.map((work, index) => (
                <motion.div
                  key={work.id}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-video bg-dark-800 border border-dark-700 overflow-hidden mb-4">
                    {work.coverUrl ? (
                      <img
                        src={work.coverUrl}
                        alt={work.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl text-dark-600">▶</span>
                      </div>
                    )}
                    {work.videoUrl && (
                      <a
                        href={work.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="text-4xl">▶</span>
                      </a>
                    )}
                  </div>
                  <h3 className="text-lg mb-2 group-hover:text-accent-gold/80 transition-colors">
                    {work.title}
                  </h3>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{work.category}</span>
                    <span>{work.creatorName}</span>
                  </div>
                  {work.description && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {work.description}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Submit CTA */}
      <section className="px-6 md:px-12 lg:px-24 mt-24">
        <div className="max-w-7xl mx-auto">
          <div className="border border-dark-700 p-12 text-center">
            <h3 className="font-display text-2xl mb-4">有优秀作品想展示？</h3>
            <p className="text-gray-500 mb-8">注册账号后上传作品，通过审核即可在作品赏析页面展示</p>
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
