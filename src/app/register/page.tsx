'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('两次密码输入不一致')
      return
    }

    if (formData.password.length < 6) {
      setError('密码至少6位')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          company: formData.company,
          password: formData.password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '注册失败')
      }

      // 注册成功，跳转到登录页
      router.push('/login?registered=true')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 pt-24 pb-16">
      <div className="max-w-xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Link href="/" className="font-display text-2xl tracking-wider mb-16 block">
            栖光
          </Link>

          <h1 className="font-display text-4xl font-light mb-4">用户注册</h1>
          <p className="text-gray-400 mb-12">注册后可上传作品参与审核，有机会在作品赏析页展示</p>

          {error && (
            <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 mb-6 text-sm">
              {error}
            </div>
          )}

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
                  手机号 *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-dark-800 border border-dark-600 px-4 py-3 text-white focus:border-accent-gold/50 focus:outline-none transition-colors"
                  placeholder="用于登录和联系"
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
                  公司/团队
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full bg-dark-800 border border-dark-600 px-4 py-3 text-white focus:border-accent-gold/50 focus:outline-none transition-colors"
                  placeholder="所属公司或团队"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-2 tracking-wide">
                密码 *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-dark-800 border border-dark-600 px-4 py-3 text-white focus:border-accent-gold/50 focus:outline-none transition-colors"
                placeholder="至少6位"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-2 tracking-wide">
                确认密码 *
              </label>
              <input
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full bg-dark-800 border border-dark-600 px-4 py-3 text-white focus:border-accent-gold/50 focus:outline-none transition-colors"
                placeholder="再次输入密码"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent-gold/20 border border-accent-gold/40 text-accent-gold px-8 py-4 text-sm tracking-widest uppercase hover:bg-accent-gold/30 transition-all duration-500 disabled:opacity-50"
            >
              {loading ? '注册中...' : '注册'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-8">
            已有账号？<Link href="/login" className="text-accent-gold hover:underline">立即登录</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
