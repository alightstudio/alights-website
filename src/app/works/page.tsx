'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import Image from 'next/image'

const categories = ['全部', 'TVC广告', '产品动画', '发布会大屏', '影视剧']

// 栖光文化真实作品数据
const works = [
  {
    id: 1,
    title: '灯语 LIST',
    category: 'TVC广告',
    year: '2024',
    thumbnail: '/works/work-1-dengyu.jpg',
    description: '现代汽车广告',
  },
  {
    id: 2,
    title: '想象 LIST',
    category: 'TVC广告',
    year: '2024',
    thumbnail: '/works/work-2-xiangxiang.jpg',
    description: '汽车广告',
  },
  {
    id: 3,
    title: '稳座 LIST',
    category: 'TVC广告',
    year: '2024',
    thumbnail: '/works/work-3-wenzuo.jpg',
    description: '汽车广告',
  },
  {
    id: 4,
    title: '零跑 D19 上市TVC',
    category: 'TVC广告',
    year: '2024',
    thumbnail: '/works/work-4-lingpao.jpg',
    description: '零跑 D19 上市广告片',
  },
  {
    id: 5,
    title: '张天爱 | 雅娜薇图',
    category: 'TVC广告',
    year: '2024',
    thumbnail: '/works/work-5-zhangtianai.jpg',
    description: '张天爱代言广告',
  },
  {
    id: 6,
    title: '自然堂×上海芭蕾舞团',
    category: 'TVC广告',
    year: '2024',
    thumbnail: '/works/work-6-zirantang.jpg',
    description: '自然堂品牌广告',
  },
  {
    id: 7,
    title: '乐道汽车',
    category: 'TVC广告',
    year: '2024',
    thumbnail: '/works/image5.png',
    description: '乐道汽车广告',
  },
  {
    id: 8,
    title: 'DIORIVIERA',
    category: 'TVC广告',
    year: '2024',
    thumbnail: '/works/image8.png',
    description: 'DIOR 夏季系列广告',
  },
  {
    id: 9,
    title: 'SuperELLE×FILA',
    category: 'TVC广告',
    year: '2024',
    thumbnail: '/works/image4.png',
    description: 'SuperELLE 与 FILA 合作广告',
  },
]

export default function WorksPage() {
  const [activeCategory, setActiveCategory] = useState('全部')

  const filteredWorks = activeCategory === '全部'
    ? works
    : works.filter(work => work.category === activeCategory)

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
          <div className="w-24 h-px bg-accent-gold/40 mx-auto mb-8" />
          <p className="text-gray-400 max-w-2xl mx-auto leading-relaxed">
            精选代表作品，展示我们在视效领域的专业实力
          </p>
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
              transition={{ duration: 0.6, delay: index * 0.05 }}
              className="group relative aspect-video bg-dark-700 overflow-hidden cursor-pointer"
            >
              {/* Thumbnail */}
              {work.thumbnail ? (
                <Image
                  src={work.thumbnail}
                  alt={work.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-dark-600 to-dark-800" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-gray-600 text-sm tracking-wide">作品预览</span>
                  </div>
                </>
              )}

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-dark-900/90 via-dark-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Info */}
              <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                <h3 className="text-lg font-light mb-2">{work.title}</h3>
                <p className="text-xs text-gray-400">{work.category} · {work.year}</p>
                {work.description && (
                  <p className="text-xs text-gray-500 mt-2">{work.description}</p>
                )}
              </div>

              {/* Play Icon */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="w-16 h-16 rounded-full border border-white/30 flex items-center justify-center">
                  <div className="w-0 h-0 border-l-[10px] border-l-white border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-1" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
