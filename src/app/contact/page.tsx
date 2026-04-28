'use client'
import { CONTACT } from '@/lib/site-constants'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const ParticleBackground = dynamic(() => import('@/components/ParticleBackground'), { ssr: false })

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [particleConfig, setParticleConfig] = useState<any>(null)

  useEffect(() => {
    fetch('/api/site')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.particle) setParticleConfig(data.particle) })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setResult(null)

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()

      if (res.ok) {
        setResult({ success: true, message: data.message })
        setFormData({ name: '', phone: '', email: '', company: '', message: '' })
      } else {
        setResult({ success: false, message: data.error || '提交失败' })
      }
    } catch {
      setResult({ success: false, message: '网络错误，请稍后重试' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Fixed full-viewport particle background */}
      {particleConfig && (
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <ParticleBackground config={particleConfig} />
        </div>
      )}
      {/* Content with semi-transparent backdrop */}
      <div className="relative z-10 pt-24 pb-32" style={{ backgroundColor: 'rgba(10,10,10,0.55)' }}>
        {/* Header */}
        <section className="px-6 md:px-12 lg:px-24 mb-32">
          <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-display text-5xl md:text-6xl font-light mb-6">
              联系我们
            </h1>
            <div className="w-24 h-px bg-accent-gold/40 mb-8" />
            <p className="text-xl text-gray-400 max-w-3xl leading-relaxed">
              期待与您一起，用光影创造不凡
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <h2 className="font-display text-2xl font-light mb-8">
                联系方式
              </h2>
              
              <div className="space-y-8 mb-12">
                <div>
                  <p className="text-sm text-gray-500 mb-2 tracking-wide">微信</p>
                  <p className="text-lg">{CONTACT.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-2 tracking-wide">邮箱</p>
                  <p className="text-lg">{CONTACT.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-2 tracking-wide">地址</p>
                  <p className="text-lg">西安市</p>
                </div>
              </div>

              <div className="pt-8 border-t border-dark-700">
                <h3 className="text-lg font-light mb-4">营业时间</h3>
                <p className="text-gray-500 text-sm">365×7×24</p>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <h2 className="font-display text-2xl font-light mb-8">
                在线咨询
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-gray-500 mb-2 tracking-wide">
                      姓名 *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-dark-800 border border-dark-600 px-4 py-3 text-white focus:border-accent-gold/50 focus:outline-none transition-colors"
                      placeholder="您的姓名"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-2 tracking-wide">
                      微信 *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-dark-800 border border-dark-600 px-4 py-3 text-white focus:border-accent-gold/50 focus:outline-none transition-colors"
                      placeholder="微信号"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-gray-500 mb-2 tracking-wide">
                      邮箱
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-dark-800 border border-dark-600 px-4 py-3 text-white focus:border-accent-gold/50 focus:outline-none transition-colors"
                      placeholder="电子邮箱"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-2 tracking-wide">
                      公司
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full bg-dark-800 border border-dark-600 px-4 py-3 text-white focus:border-accent-gold/50 focus:outline-none transition-colors"
                      placeholder="公司名称"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-500 mb-2 tracking-wide">
                    项目描述 *
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-dark-800 border border-dark-600 px-4 py-3 text-white focus:border-accent-gold/50 focus:outline-none transition-colors resize-none"
                    placeholder="请简要描述您的项目需求..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full border border-accent-gold/40 text-accent-gold px-8 py-4 text-sm tracking-widest uppercase hover:bg-accent-gold/10 transition-all duration-500 disabled:opacity-50"
                >
                  {submitting ? '提交中...' : '提交咨询'}
                </button>

                {result && (
                  <div className={`text-center text-sm ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                    {result.message}
                  </div>
                )}

                <p className="text-xs text-gray-600 text-center">
                  提交后我们将尽快与您联系，或通过 AI 助手获得即时回复
                </p>
              </form>
            </motion.div>
          </div>
        </div>
      </section>


    </div>
    </>
  )
}
