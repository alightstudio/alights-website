'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    message: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: 实现表单提交和 AI 回复功能
    console.log('Form submitted:', formData)
    alert('感谢您的留言，我们会尽快回复！')
  }

  return (
    <div className="pt-24 pb-32">
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
                  <p className="text-sm text-gray-500 mb-2 tracking-wide">电话</p>
                  <p className="text-lg">15091855505</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-2 tracking-wide">邮箱</p>
                  <p className="text-lg">184436962@qq.com</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-2 tracking-wide">地址</p>
                  <p className="text-lg">西安市</p>
                </div>
              </div>

              <div className="pt-8 border-t border-dark-700">
                <h3 className="text-lg font-light mb-4">营业时间</h3>
                <p className="text-gray-500 text-sm">周一至周五 9:00 - 18:00</p>
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
                      电话 *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-dark-800 border border-dark-600 px-4 py-3 text-white focus:border-accent-gold/50 focus:outline-none transition-colors"
                      placeholder="联系电话"
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
                  className="w-full border border-accent-gold/40 text-accent-gold px-8 py-4 text-sm tracking-widest uppercase hover:bg-accent-gold/10 transition-all duration-500"
                >
                  提交咨询
                </button>

                <p className="text-xs text-gray-600 text-center">
                  提交后我们将尽快与您联系，或通过 AI 助手获得即时回复
                </p>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* AI Chat Widget (Placeholder) */}
      <div className="fixed bottom-8 right-8">
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1 }}
          className="w-14 h-14 rounded-full bg-accent-gold/20 border border-accent-gold/40 flex items-center justify-center hover:bg-accent-gold/30 transition-colors"
          onClick={() => alert('AI 聊天功能即将上线')}
        >
          <svg className="w-6 h-6 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </motion.button>
      </div>
    </div>
  )
}
