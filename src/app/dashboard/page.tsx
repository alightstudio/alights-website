'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

interface Work {
  id: string
  title: string
  category: string
  status: string
  createdAt: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'TVC广告',
    videoUrl: '',
    creatorName: '',
    creatorPhone: '',
  })

  useEffect(() => {
    fetchWorks()
  }, [])

  const fetchWorks = async () => {
    try {
      const res = await fetch('/api/works')
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

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const res = await fetch('/api/works', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })

    if (res.ok) {
      setShowUploadModal(false)
      setFormData({ title: '', description: '', category: 'TVC广告', videoUrl: '', creatorName: '', creatorPhone: '' })
      fetchWorks()
      alert('作品提交成功，等待审核')
    }
  }

  const getStatusLabel = (status: string) => {
    const map: Record<string, { text: string; class: string }> = {
      PENDING: { text: '待审核', class: 'text-yellow-500' },
      APPROVED: { text: '已通过', class: 'text-green-500' },
      REJECTED: { text: '已拒绝', class: 'text-red-500' },
    }
    return map[status] || { text: status, class: 'text-gray-500' }
  }

  return (
    <div className="min-h-screen bg-dark-900 pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex justify-between items-center mb-16">
            <div>
              <h1 className="font-display text-4xl font-light mb-2">用户中心</h1>
              <p className="text-gray-500">管理您的作品提交</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-white transition-colors"
            >
              退出登录
            </button>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-4 mb-12">
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-accent-gold/20 border border-accent-gold/40 text-accent-gold px-6 py-3 text-sm tracking-widest uppercase hover:bg-accent-gold/30 transition-all"
            >
              + 上传作品
            </button>
            <Link
              href="/gallery"
              className="border border-dark-600 text-gray-400 px-6 py-3 text-sm tracking-widest uppercase hover:border-gray-600 hover:text-white transition-all"
            >
              作品赏析
            </Link>
          </div>

          {/* 作品列表 */}
          {loading ? (
            <div className="text-center py-20 text-gray-500">加载中...</div>
          ) : works.length === 0 ? (
            <div className="text-center py-20 border border-dark-700">
              <p className="text-gray-500 mb-4">暂无提交记录</p>
              <p className="text-sm text-gray-600">点击上方"上传作品"开始提交您的第一个作品</p>
            </div>
          ) : (
            <div className="space-y-4">
              {works.map((work) => (
                <div
                  key={work.id}
                  className="flex items-center justify-between p-6 bg-dark-800 border border-dark-700 hover:border-dark-600 transition-colors"
                >
                  <div>
                    <h3 className="text-lg mb-1">{work.title}</h3>
                    <p className="text-sm text-gray-500">
                      {work.category} · {new Date(work.createdAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <span className={`text-sm ${getStatusLabel(work.status).class}`}>
                    {getStatusLabel(work.status).text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* 上传弹窗 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-dark-800 border border-dark-600 w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-display text-2xl">上传作品</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm text-gray-500 mb-2">作品标题 *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-600 px-4 py-3 focus:border-accent-gold/50 focus:outline-none"
                  placeholder="例如：XX品牌 TVC广告"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-2">作品简介</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-600 px-4 py-3 focus:border-accent-gold/50 focus:outline-none resize-none"
                  placeholder="简要描述作品内容..."
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-2">作品类型 *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-600 px-4 py-3 focus:border-accent-gold/50 focus:outline-none"
                >
                  <option value="TVC广告">TVC广告</option>
                  <option value="产品动画">产品动画</option>
                  <option value="发布会大屏">发布会大屏</option>
                  <option value="影视剧">影视剧</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-2">视频链接</label>
                <input
                  type="url"
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-600 px-4 py-3 focus:border-accent-gold/50 focus:outline-none"
                  placeholder="B站/腾讯视频/YouTube 等链接"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-gray-500 mb-2">创作者姓名</label>
                  <input
                    type="text"
                    value={formData.creatorName}
                    onChange={(e) => setFormData({ ...formData, creatorName: e.target.value })}
                    className="w-full bg-dark-700 border border-dark-600 px-4 py-3 focus:border-accent-gold/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-2">联系方式</label>
                  <input
                    type="tel"
                    value={formData.creatorPhone}
                    onChange={(e) => setFormData({ ...formData, creatorPhone: e.target.value })}
                    className="w-full bg-dark-700 border border-dark-600 px-4 py-3 focus:border-accent-gold/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-accent-gold/20 border border-accent-gold/40 text-accent-gold px-8 py-4 text-sm tracking-widest uppercase hover:bg-accent-gold/30 transition-all"
                >
                  提交审核
                </button>
                <p className="text-xs text-gray-600 text-center mt-4">
                  提交后管理员将在24小时内完成审核，通过后作品将在"作品赏析"页面展示
                </p>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
